import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Insights, Quote } from './api';

const problems = (quote: Quote) => [
  quote.addsUp === false ? `Its items add up to ${quote.sumText}, not ${quote.totalText}.` : '',
  quote.vehicleMatches === false ? `Registration on it: ${quote.registration}.` : '',
  quote.leavesOut.length ? `Leaves out: ${quote.leavesOut.join(', ')}.` : '',
  ...quote.readingIssues,
].filter(Boolean);

/** Quotes side by side, line by line. The suggestion is worked out by rules, with its reasons shown, and a person decides. */
export function QuoteCompare({ insights, docLink }: { insights: Insights; docLink: (documentId: string, children: ReactNode) => ReactNode }) {
  const { rows, suggestion, noSuggestion } = insights.comparison;
  const picked = insights.comparison.quotes.find((quote) => quote.documentId === suggestion?.documentId);
  // The suggested quote goes first, so it is in view on a phone.
  const quotes = [...insights.comparison.quotes].sort((a, b) => Number(b === picked) - Number(a === picked));
  return (
    <div className="grid gap-3">
      {picked ? (
        <div className="border-l-4 border-accent bg-sunken/60 p-3">
          <p className="font-display text-[1.35rem] font-extrabold leading-tight">Suggested starting point: {picked.supplier}</p>
          <ul className="mt-1 grid gap-0.5 text-small">{suggestion!.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <p className="mt-1.5 text-caption text-muted">Worked out from price and completeness only. It doesn't weigh parts quality or the repairer's record, and a person decides.</p>
        </div>
      ) : noSuggestion && <p className="text-small text-muted">{noSuggestion}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-small">
          <thead>
            <tr>
              <th scope="col" className="sr-only">Work</th>
              {quotes.map((quote) => (
                <th key={quote.documentId} scope="col" className={cn('border-b-2 border-paper-ink/70 px-2 pb-1.5 text-left align-bottom font-semibold', quote === picked && 'bg-sunken/60')}>
                  {quote === picked && <span className="pen block text-[1.5rem] font-normal leading-none text-danger">start here</span>}
                  {docLink(quote.documentId, quote.supplier)}
                  {quote.number && <span className="block text-caption font-normal text-muted">{quote.number}{quote.date ? `, ${quote.date}` : ''}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.work} className="border-b border-line">
                <th scope="row" className="py-1 pr-2 text-left font-normal">{row.work}</th>
                {quotes.map((quote) => {
                  const price = row.prices.find((item) => item.document_id === quote.documentId);
                  return <td key={quote.documentId} className={cn('tabular px-2 py-1', quote === picked && 'bg-sunken/60', !price && 'text-muted')}>{price?.amount ?? 'Not priced'}</td>;
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-1.5 pr-2 text-left font-bold">Total on the quote</th>
              {quotes.map((quote) => <td key={quote.documentId} className={cn('tabular px-2 py-1.5 font-bold', quote === picked && 'bg-sunken/60')}>{quote.totalText || 'Not found'}</td>)}
            </tr>
            <tr>
              <th scope="row" className="py-1 pr-2 text-left align-top font-normal text-muted">To check</th>
              {quotes.map((quote) => {
                const list = problems(quote);
                return (
                  <td key={quote.documentId} className={cn('px-2 py-1 align-top text-caption', quote === picked && 'bg-sunken/60')}>
                    {list.length ? <ul className="grid gap-0.5 text-danger">{list.map((item) => <li key={item}>{item}</li>)}</ul> : <span className="text-muted">Nothing found</span>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
