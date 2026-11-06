import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addUp, buildInsights, parseMoney, type DocFacts } from '../insights.ts';

const claim = { vehicleReg: 'SMP 1234', lossDate: '2026-09-01', policyStart: '2026-01-01', policyEnd: '2026-12-31', createdAt: '2026-09-11T08:00:00.000Z' };
const quote = (id: string, supplier: string, total: string, items: [string, string][], extra: Record<string, string> = {}): DocFacts => ({
  id, filename: `${id}.pdf`, docType: 'repair_quote', status: 'done', language: 'English', handwritten: false, issues: [],
  fields: Object.entries({ supplier_name: supplier, amount_total: total, ...extra }).map(([key, value]) => ({ key, value })),
  lineItems: items.map(([description, amount]) => ({ description, amount })),
});
const row = (work: string, ...prices: [string, string][]) => ({ work, prices: prices.map(([document_id, amount]) => ({ document_id, amount })) });
const compare = (docs: DocFacts[], rows: ReturnType<typeof row>[]) => buildInsights(claim, docs, { quote_rows: rows }).comparison;

test('money is read in the ways people write it', () => {
  assert.deepEqual(parseMoney('USD 1,250.00'), { currency: 'USD', value: 1250 });
  assert.deepEqual(parseMoney('1 250,50 ZAR'), { currency: 'ZAR', value: 1250.5 });
  assert.deepEqual(parseMoney('$1,250'), { currency: '$', value: 1250 });
  assert.deepEqual(parseMoney('-USD 50.00'), { currency: 'USD', value: -50 });
  assert.equal(parseMoney('see below'), null);
});

test('figures that do not add up are caught, and mixed or thin figures are left alone', () => {
  const lines = [{ description: 'a', amount: 'USD 60' }, { description: 'b', amount: 'USD 230' }];
  assert.equal(addUp(lines, 'USD 390')?.matches, false);
  assert.equal(addUp(lines, 'USD 290.00')?.matches, true);
  assert.equal(addUp([{ description: 'a', amount: 'ZAR 60' }, { description: 'b', amount: 'USD 230' }], 'USD 290'), null);
  assert.equal(addUp([lines[0]], 'USD 60'), null);
});

test('the suggestion skips a cheaper quote that leaves work out, and says why', () => {
  const docs = [
    quote('a', 'Fair Panel', 'USD 1,000', [['Door', 'USD 600'], ['Paint', 'USD 400']]),
    quote('b', 'Cheap Panel', 'USD 700', [['Door', 'USD 700']]),
    quote('c', 'Dear Panel', 'USD 1,500', [['Door', 'USD 900'], ['Paint', 'USD 600']]),
  ];
  const { suggestion, quotes } = compare(docs, [row('Door', ['a', 'USD 600'], ['b', 'USD 700'], ['c', 'USD 900']), row('Paint', ['a', 'USD 400'], ['c', 'USD 600'])]);
  assert.equal(suggestion?.documentId, 'a');
  assert.deepEqual(quotes.find((item) => item.documentId === 'b')?.leavesOut, ['Paint']);
  assert.match(suggestion!.reasons.join(' '), /USD 500\.00 less than the highest/);
  assert.match(suggestion!.reasons.join(' '), /Cheap Panel is lower at USD 700\.00, but it leaves out paint/);
});

test('a cheaper quote is passed over when it does not add up or names another vehicle', () => {
  const docs = [
    quote('a', 'Fair', 'USD 1,000', [['Door', 'USD 600'], ['Paint', 'USD 400']]),
    quote('b', 'Wrong sum', 'USD 500', [['Door', 'USD 400'], ['Paint', 'USD 400']]),
    quote('c', 'Wrong car', 'USD 600', [['Door', 'USD 300'], ['Paint', 'USD 300']], { vehicle_registration: 'SMP 9999' }),
  ];
  const { suggestion } = compare(docs, []);
  assert.equal(suggestion?.documentId, 'a');
  assert.match(suggestion!.reasons.join(' '), /items add up to USD 800\.00/);
  assert.match(suggestion!.reasons.join(' '), /registration SMP 9999/);
});

test('a price the quote does not show is dropped, so the AI cannot invent a figure', () => {
  const docs = [quote('a', 'A', 'USD 100', [['Door', 'USD 100']]), quote('b', 'B', 'USD 90', [['Door', 'USD 90']])];
  const { rows } = compare(docs, [row('Door', ['a', 'USD 55'], ['b', 'USD 90'], ['ghost', 'USD 1'])]);
  assert.deepEqual(rows[0].prices, [{ document_id: 'b', amount: 'USD 90' }]);
});

test('no suggestion is made from a single quote, or when every quote has a problem', () => {
  assert.match(compare([quote('a', 'A', 'USD 100', [])], []).noSuggestion, /only one quote/);
  const bad = compare([quote('a', 'A', '', []), quote('b', 'B', 'smudged', [])], []);
  assert.equal(bad.suggestion, null);
  assert.match(bad.noSuggestion, /problem to clear up/);
});

test('cover dates, sum insured and the timeline are worked out', () => {
  assert.equal(buildInsights(claim, [], null).cover.state, 'inside');
  assert.equal(buildInsights({ ...claim, policyStart: '2026-08-20' }, [], null).cover.state, 'early');
  const before = buildInsights({ ...claim, policyStart: '2026-10-01' }, [], null).cover;
  assert.equal(before.state, 'outside');
  assert.match(before.text, /30 days before cover starts/);
  assert.equal(buildInsights({ ...claim, policyStart: '', policyEnd: '' }, [], null).cover.state, 'unknown');

  const insured = quote('a', 'A', 'USD 900', [], { sum_insured: 'USD 500' });
  const result = buildInsights(claim, [insured], { dates: [{ label: 'Quote', value: '2026-09-04', document_id: 'a' }, { label: 'Vague', value: 'early September', document_id: '' }] });
  assert.deepEqual(result.sumInsured, { text: 'USD 500.00', over: true });
  assert.equal(result.value.source, 'the only quote');
  assert.equal(result.daysToOpen, 10);
  assert.deepEqual(result.timeline.map((event) => [event.date, event.daysAfterPrevious]), [['2026-01-01', null], ['2026-09-01', 243], ['2026-09-04', 3], ['2026-09-11', 7], ['2026-12-31', 111]]);
});
