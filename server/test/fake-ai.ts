import { createServer } from 'node:http';

/** Stands in for the AI service in tests. It checks the shape of each request, and returns fixed answers. It says nothing about AI quality. */
export function startFakeAi(port: number) {
  const requests: any[] = [];
  let limitNext = 0;
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const body = JSON.parse(raw);
      if (!req.url?.includes(':generateContent')) requests.push({ headers: req.headers, body });
      if (req.url?.includes(':generateContent')) {
        requests.push({ gemini: true, url: req.url, headers: req.headers, body });
        if (limitNext > 0) {
          limitNext -= 1;
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } }));
          return;
        }
        const instruction = String(body.systemInstruction?.parts?.[0]?.text ?? body.systemInstruction ?? '');
        const parts = body.contents[0].parts;
        const answer = instruction.includes('review an insurance claim file') ? review() : reading({ messages: [{ content: parts }] });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(answer) }] } }] }));
        return;
      }
      if (!body.stream) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'msg_0', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: 'OK' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }));
        return;
      }
      const isReview = String(body.system).includes('review an insurance claim file');
      const text = JSON.stringify(isReview ? review() : reading(body));
      const message = { id: 'msg_1', type: 'message', role: 'assistant', model: body.model, content: [] as unknown[], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } };
      const events: [string, object][] = [
        ['message_start', { type: 'message_start', message }],
        ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
        ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }],
        ['content_block_stop', { type: 'content_block_stop', index: 0 }],
        ['message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 20 } }],
        ['message_stop', { type: 'message_stop' }],
      ];
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      for (const [name, data] of events) res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
      res.end();
    });
  });
  server.listen(port);
  return { requests, limitNextRequests: (count: number) => (limitNext = count), close: () => server.close() };
}

const field = (key: string, label: string, value: string) => ({ key, label, value, page: 1, quote: value, confidence: 'high' });

function reading(body: any) {
  const prompt: string = body.messages[0].content.at(-1).text;
  const isQuote = prompt.includes('quote');
  if (prompt.includes('licence') || prompt.includes('registration')) {
    const licence = prompt.includes('licence');
    return {
      doc_type: licence ? 'drivers_licence' : 'vehicle_registration', confidence: 'high', language: 'English', handwritten: false,
      description: licence ? "A driver's licence." : 'A vehicle registration book.', issues: [],
      fields: [licence ? field('licence_number', 'Licence number', 'SMP-DL-448120') : field('vehicle_registration', 'Registration', 'SMP 1234')],
      line_items: [],
    };
  }
  return {
    doc_type: isQuote ? 'repair_quote' : 'claim_form',
    confidence: 'high',
    language: 'English',
    handwritten: false,
    description: isQuote ? 'A repair quote.' : 'A signed claim form.',
    issues: [],
    fields: isQuote
      ? [field('vehicle_registration', 'Registration', 'SMP 1284'), field('quote_number', 'Quote number', 'Q-5521'), field('amount_total', 'Total', 'USD 1,250.00')]
      : [field('vehicle_registration', 'Registration', 'SMP 1234'), field('claimant_name', 'Claimant', 'Farai Specimen'), field('loss_date', 'Loss date', '2026-09-01')],
    line_items: isQuote ? [{ description: 'Panel work', amount: 'USD 1,000.00' }, { description: 'Labour', amount: 'USD 250.00' }] : [],
  };
}

function review() {
  return {
    flags: [{ title: 'Quote is dated before the loss', detail: 'The quote predates the accident.', severity: 'note', document_ids: [] }],
    claim_details: { claimant_name: 'Farai Specimen', contact_email: 'farai@example.com', contact_phone: '+263 77 000 0000', policy_number: 'SMPL-POL-7731', vehicle_registration: '', loss_date: '2026-09-01', policy_start: '', policy_end: '' },
    suggested_class: 'Motor comprehensive',
    summary: {
      overview: 'A motor accident claim. The police report is outstanding.',
      parties: [{ role: 'Claimant', name: 'Farai Specimen' }],
      dates: [{ label: 'Loss', value: '2026-09-01', document_id: '' }],
      amounts: [{ label: 'Repair quote', value: 'USD 1,250.00', document_id: '' }],
    },
    quote_rows: [],
    next_steps: ['Ask the claimant for the police report.'],
    request: { subject: 'Documents needed for your claim', body: 'Please send the police report.' },
  };
}
