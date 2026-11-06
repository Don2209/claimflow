/** Works out what the summary page shows from what was read. No AI and no database here, so every figure can be traced and repeated. */
export type Money = { currency: string; value: number };
export type LineItem = { description: string; amount: string };
export type QuoteRow = { work: string; prices: { document_id: string; amount: string }[] };
export type DocFacts = { id: string; filename: string; docType: string | null; status: string; language: string; handwritten: boolean; issues: string[]; fields: { key: string; value: string }[]; lineItems: LineItem[] };
type Summary = { dates?: { label: string; value: string; document_id: string }[]; quote_rows?: QuoteRow[] } | null;
type ClaimFacts = { vehicleReg: string; lossDate: string; policyStart: string; policyEnd: string; createdAt: string };

const CENTS = 0.05;
const EARLY_CLAIM_DAYS = 30;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const normal = (value: unknown) => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const fieldOf = (doc: DocFacts, key: string) => doc.fields.find((field) => field.key === key && field.value)?.value ?? '';
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / 864e5);

export function parseMoney(text: string): Money | null {
  const number = String(text).match(/\d[\d\s.,]*\d|\d/);
  if (!number) return null;
  const compact = number[0].replace(/\s/g, '');
  // A last separator followed by one or two digits is the decimal point. Anything else groups thousands.
  const decimals = compact.match(/[.,](\d{1,2})$/);
  const whole = (decimals ? compact.slice(0, -decimals[0].length) : compact).replace(/[.,]/g, '');
  const value = Number(`${whole}.${decimals ? decimals[1] : '0'}`);
  if (!Number.isFinite(value)) return null;
  return { currency: String(text).replace(number[0], '').replace(/[^A-Za-z$€£]/g, '').toUpperCase(), value: /^\s*[-−(]/.test(text) ? -value : value };
}

const show = ({ currency, value }: Money) => `${currency ? `${currency} ` : ''}${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Adds a document's priced lines. Empty when there are too few to check, or the currencies are mixed. */
export function addUp(items: LineItem[], totalText: string): { sum: Money; total: Money; matches: boolean } | null {
  const total = parseMoney(totalText);
  const amounts = items.map((item) => parseMoney(item.amount));
  if (!total || amounts.length < 2 || amounts.some((amount) => !amount)) return null;
  const currencies = new Set([total.currency, ...amounts.map((amount) => amount!.currency)].filter(Boolean));
  if (currencies.size > 1) return null;
  const sum = { currency: total.currency || [...currencies][0] || '', value: amounts.reduce((all, amount) => all + amount!.value, 0) };
  return { sum, total, matches: Math.abs(sum.value - total.value) <= CENTS };
}

function compareQuotes(claim: ClaimFacts, docs: DocFacts[], rows: QuoteRow[]) {
  const quoteDocs = docs.filter((doc) => doc.docType === 'repair_quote' && doc.status === 'done');
  // Only keep a price the document really shows, so the AI cannot put a figure in a quote's mouth.
  const cleanRows = rows.map((row) => ({
    work: row.work,
    prices: row.prices.filter((price) => {
      const doc = quoteDocs.find((item) => item.id === price.document_id);
      const value = parseMoney(price.amount)?.value;
      return doc && value !== undefined && doc.lineItems.some((item) => parseMoney(item.amount)?.value === value);
    }),
  })).filter((row) => row.prices.length);
  const quotes = quoteDocs.map((doc) => {
    const totalText = fieldOf(doc, 'amount_total');
    const total = parseMoney(totalText);
    const check = addUp(doc.lineItems, totalText);
    const reg = fieldOf(doc, 'vehicle_registration');
    const vehicleMatches = reg && claim.vehicleReg ? normal(reg) === normal(claim.vehicleReg) : null;
    const leavesOut = cleanRows.filter((row) => row.prices.length > quoteDocs.length / 2 && !row.prices.some((price) => price.document_id === doc.id)).map((row) => row.work);
    const onlyThisOne = cleanRows.filter((row) => row.prices.length === 1 && row.prices[0].document_id === doc.id && quoteDocs.length > 1).map((row) => row.work);
    return {
      documentId: doc.id, filename: doc.filename, supplier: fieldOf(doc, 'supplier_name') || doc.filename, number: fieldOf(doc, 'quote_number'), date: fieldOf(doc, 'quote_date'),
      total, totalText: total ? show(total) : totalText, itemCount: doc.lineItems.length, addsUp: check ? check.matches : null, sumText: check ? show(check.sum) : '',
      registration: reg, vehicleMatches, leavesOut, onlyThisOne, readingIssues: doc.issues,
    };
  });

  let suggestion: { documentId: string; reasons: string[] } | null = null;
  let noSuggestion = '';
  if (quotes.length === 1) noSuggestion = 'There is only one quote, so there is nothing to compare it with.';
  if (quotes.length > 1) {
    const counts = new Map<string, number>();
    for (const quote of quotes) if (quote.total?.currency) counts.set(quote.total.currency, (counts.get(quote.total.currency) ?? 0) + 1);
    const mainCurrency = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    const why = (quote: (typeof quotes)[number]) => [
      !quote.total ? 'no total could be read' : '',
      quote.total && mainCurrency && quote.total.currency && quote.total.currency !== mainCurrency ? `it is in ${quote.total.currency}, not ${mainCurrency}` : '',
      quote.addsUp === false ? `its items add up to ${quote.sumText}, not its total of ${quote.totalText}` : '',
      quote.vehicleMatches === false ? `it names registration ${quote.registration}, not ${claim.vehicleReg}` : '',
    ].filter(Boolean);
    const usable = quotes.filter((quote) => !why(quote).length).sort((a, b) => a.leavesOut.length - b.leavesOut.length || a.total!.value - b.total!.value);
    const pick = usable[0];
    if (!pick) noSuggestion = 'No quote can be suggested, because each one has a problem to clear up first.';
    else {
      const priced = quotes.filter((quote) => quote.total && !(mainCurrency && quote.total.currency && quote.total.currency !== mainCurrency));
      const highest = Math.max(...priced.map((quote) => quote.total!.value));
      const reasons = [pick.leavesOut.length ? `It leaves out the least work of the quotes that can be used, at ${pick.totalText}.` : `It is the lowest total, at ${pick.totalText}, among quotes that cover the work the others price.`];
      if (highest > pick.total!.value) reasons.push(`That is ${show({ currency: pick.total!.currency, value: highest - pick.total!.value })} less than the highest quote.`);
      for (const quote of quotes.filter((item) => item !== pick && item.total && item.total.value < pick.total!.value)) {
        const problems = [...why(quote), quote.leavesOut.length ? `it leaves out ${quote.leavesOut.join(', ').toLowerCase()}` : ''].filter(Boolean);
        if (problems.length) reasons.push(`${quote.supplier} is lower at ${quote.totalText}, but ${problems.join(', and ')}.`);
      }
      if (pick.onlyThisOne.length) reasons.push(`Check its extra work: ${pick.onlyThisOne.join(', ').toLowerCase()}. No other quote prices this.`);
      if (quotes.length === 2 && cleanRows.some((row) => row.prices.length === 1)) reasons.push('The two quotes do not price exactly the same work, so compare them line by line.');
      suggestion = { documentId: pick.documentId, reasons };
    }
  }
  return { quotes, rows: cleanRows, suggestion, noSuggestion };
}

function coverCheck(claim: ClaimFacts) {
  const { lossDate: loss, policyStart: start, policyEnd: end } = claim;
  if (!ISO.test(loss)) return { state: 'unknown', text: 'The date of loss is not in the file yet.' };
  if (!ISO.test(start) && !ISO.test(end)) return { state: 'unknown', text: 'The cover dates are not in the file, so they cannot be checked against the loss.' };
  if (ISO.test(start) && loss < start) return { state: 'outside', text: `The loss on ${loss} is ${daysBetween(loss, start)} days before cover starts on ${start}.` };
  if (ISO.test(end) && loss > end) return { state: 'outside', text: `The loss on ${loss} is ${daysBetween(end, loss)} days after cover ends on ${end}.` };
  if (!ISO.test(start)) return { state: 'inside', text: `The loss on ${loss} is before cover ends on ${end}. The start date is not in the file.` };
  const into = daysBetween(start, loss);
  return { state: into <= EARLY_CLAIM_DAYS ? 'early' : 'inside', text: `The loss on ${loss} is inside the cover dates, ${into} days after cover started.${into <= EARLY_CLAIM_DAYS ? ' That is soon after cover began.' : ''}` };
}

function buildTimeline(claim: ClaimFacts, summary: Summary) {
  const events = [
    { date: claim.policyStart, label: 'Cover starts', documentId: '' },
    { date: claim.lossDate, label: 'Date of loss', documentId: '' },
    { date: claim.policyEnd, label: 'Cover ends', documentId: '' },
    // A later date in a document is usually an expiry, not something that has happened.
    ...(summary?.dates ?? []).filter((item) => item.value <= new Date().toISOString().slice(0, 10)).map((item) => ({ date: item.value, label: item.label, documentId: item.document_id })),
    { date: claim.createdAt.slice(0, 10), label: 'Claim opened in ClaimsFlow', documentId: '' },
  ].filter((event) => ISO.test(event.date));
  const byDate = new Map<string, { date: string; labels: string[]; documentId: string; isLoss: boolean }>();
  for (const event of events) {
    const row = byDate.get(event.date) ?? { date: event.date, labels: [], documentId: '', isLoss: false };
    if (!row.labels.some((label) => normal(label) === normal(event.label))) row.labels.push(event.label);
    row.documentId ||= event.documentId;
    row.isLoss ||= event.date === claim.lossDate;
    byDate.set(event.date, row);
  }
  const sorted = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((row, index) => ({ ...row, daysAfterPrevious: index ? daysBetween(sorted[index - 1].date, row.date) : null }));
}

export function buildInsights(claim: ClaimFacts, docs: DocFacts[], summary: Summary) {
  const comparison = compareQuotes(claim, docs, summary?.quote_rows ?? []);
  const chosen = comparison.quotes.find((quote) => quote.documentId === comparison.suggestion?.documentId);
  const onlyQuote = comparison.quotes.length === 1 ? comparison.quotes[0] : null;
  const invoice = docs.find((doc) => doc.docType === 'invoice' && fieldOf(doc, 'amount_total'));
  const claimed = docs.map((doc) => fieldOf(doc, 'amount_claimed')).find(Boolean);
  const valueText = chosen?.totalText || onlyQuote?.totalText || (claimed ?? '') || (invoice ? fieldOf(invoice, 'amount_total') : '');
  const value = {
    text: valueText,
    source: chosen ? 'the suggested quote' : onlyQuote?.totalText ? 'the only quote' : claimed ? 'the amount claimed' : invoice ? 'the invoice' : '',
  };
  const insuredText = docs.map((doc) => fieldOf(doc, 'sum_insured')).find(Boolean) ?? '';
  const insured = parseMoney(insuredText);
  const valueMoney = parseMoney(valueText);
  const sumInsured = insured ? {
    text: show(insured),
    over: Boolean(valueMoney && (!valueMoney.currency || !insured.currency || valueMoney.currency === insured.currency) && valueMoney.value > insured.value),
  } : null;
  return {
    comparison,
    value,
    sumInsured,
    cover: coverCheck(claim),
    timeline: buildTimeline(claim, summary),
    daysToOpen: ISO.test(claim.lossDate) ? daysBetween(claim.lossDate, claim.createdAt) : null,
    recheck: docs.filter((doc) => doc.status === 'failed' || doc.issues.length).map((doc) => ({ documentId: doc.id, filename: doc.filename, issues: doc.issues })),
    languages: [...new Set(docs.map((doc) => doc.language).filter(Boolean))],
    handwritten: docs.filter((doc) => doc.handwritten).length,
  };
}
