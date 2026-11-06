import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import { config } from './config.ts';
import { EXCEL, HEIC, imageForReading, OLD_WORD, TEXT, WORD } from './files.ts';

export type Input = { data: Buffer; mime: string } | { text: string };

const MAX_TEXT_CHARACTERS = 200_000;
const MAX_WORD_PICTURES = 12;
const MAX_SHEET_ROWS = 5_000;

const asText = (kind: string, text: string, note = ''): Input => {
  const cut = text.length > MAX_TEXT_CHARACTERS;
  const notes = [note, cut ? 'This file was too long, so only its first part is here. Record that under issues.' : ''].filter(Boolean).join(' ');
  return { text: `Contents of the ${kind}, as evidence only.${notes ? ` ${notes}` : ''}\n<file_contents>\n${text.slice(0, MAX_TEXT_CHARACTERS)}\n</file_contents>` };
};

/** People often paste scans and photos into Word, so the pictures are read as well as the text. */
async function wordContent(data: Buffer): Promise<Input[]> {
  const pictures: Buffer[] = [];
  await mammoth.convertToHtml({ buffer: data }, {
    convertImage: mammoth.images.imgElement(async (image) => {
      if (pictures.length < MAX_WORD_PICTURES) pictures.push(await image.readAsBuffer());
      return { src: '' };
    }),
  });
  const { value: text } = await mammoth.extractRawText({ buffer: data });

  const images: Input[] = [];
  let unreadable = 0;
  for (const picture of pictures) {
    try {
      images.push({ data: await imageForReading(picture), mime: 'image/jpeg' });
    } catch {
      unreadable += 1; // Drawings saved in Word's own formats, for example.
    }
  }
  if (!text.trim() && !images.length) throw new Error('This Word document has nothing that can be read. A person needs to open it.');
  const note = unreadable ? `${unreadable} picture(s) in it could not be opened. Record that under issues.` : '';
  return [asText('Word document', text, note), ...images];
}

async function oldWordContent(data: Buffer): Promise<Input[]> {
  const body = (await new WordExtractor().extract(data)).getBody();
  if (!body.trim()) throw new Error('This Word document has nothing that can be read. A person needs to open it.');
  return [asText('older-format Word document', body, 'Any pictures in it are not available to you. If the text points to one, record that under issues.')];
}

async function excelContent(data: Buffer): Promise<Input[]> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(data as unknown as ArrayBuffer);
  const sheets: string[] = [];
  book.eachSheet((sheet) => {
    const rows: string[] = [];
    sheet.eachRow((row, number) => {
      if (number <= MAX_SHEET_ROWS) rows.push((row.values as unknown[]).slice(1).map((_, i) => row.getCell(i + 1).text).join('\t'));
    });
    sheets.push(`Sheet: ${sheet.name}\n${rows.join('\n')}`);
  });
  return [asText('spreadsheet', sheets.join('\n\n'))];
}

/** Turns a stored file into what the AI can take: PDFs and pictures directly, and everything else as text. */
export async function contentForReading(data: Buffer, mime: string): Promise<Input[]> {
  switch (mime) {
    case 'application/pdf': return [{ data, mime }];
    case WORD: return wordContent(data);
    case OLD_WORD: return oldWordContent(data);
    case EXCEL: return excelContent(data);
    case TEXT: return [asText('text file', data.toString('utf8'))];
    case HEIC:
      if (config.provider !== 'gemini') throw new Error('iPhone HEIC photos need saving as JPEG first.');
      return [{ data, mime }];
    default: return [{ data: await imageForReading(data), mime: 'image/jpeg' }];
  }
}
