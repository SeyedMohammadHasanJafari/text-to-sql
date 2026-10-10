import { Readable } from 'node:stream';
import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import { badRequest } from '#lib/errors.js';

export const MAX_ROWS_PER_DATASET = 50_000;
export const MAX_COLUMNS_PER_DATASET = 100;

/**
 * Parses a CSV buffer into headers and structured row objects.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{ headers: string[], rows: Record<string, unknown>[] }>}
 */
export async function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = [];
    let headersCollected = false;

    // Remove UTF-8 BOM if present
    let cleanBuffer = buffer;
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      cleanBuffer = buffer.subarray(3);
    }

    const stream = Readable.from(cleanBuffer);

    stream
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header.trim(),
          skipEmptyLines: true,
        }),
      )
      .on('headers', (collectedHeaders) => {
        headers = collectedHeaders.filter((h) => h !== '');
        headersCollected = true;

        if (headers.length === 0) {
          stream.destroy(badRequest('The CSV file contains no valid column headers'));
          return;
        }

        if (headers.length > MAX_COLUMNS_PER_DATASET) {
          stream.destroy(
            badRequest(`Dataset contains ${headers.length} columns (max allowed is ${MAX_COLUMNS_PER_DATASET})`),
          );
        }
      })
      .on('data', (data) => {
        if (rows.length < MAX_ROWS_PER_DATASET) {
          rows.push(data);
        } else {
          // If exceeded max rows, stop reading
          stream.destroy();
        }
      })
      .on('end', () => {
        if (!headersCollected || headers.length === 0) {
          return reject(badRequest('The CSV file does not have valid header columns'));
        }
        resolve({ headers, rows });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * Parses an Excel (.xlsx, .xls) buffer into headers and row objects.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{ headers: string[], rows: Record<string, unknown>[] }>}
 */
export async function parseExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw badRequest('The Excel workbook contains no readable sheets or rows');
  }

  const headerRow = worksheet.getRow(1);
  const headers = [];
  const colIndexToHeader = new Map();

  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value ?? '').trim();
    if (val) {
      headers.push(val);
      colIndexToHeader.set(colNumber, val);
    }
  });

  if (headers.length === 0) {
    throw badRequest('The Excel sheet contains no valid header row');
  }

  if (headers.length > MAX_COLUMNS_PER_DATASET) {
    throw badRequest(`Excel sheet contains ${headers.length} columns (max allowed is ${MAX_COLUMNS_PER_DATASET})`);
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    if (rows.length >= MAX_ROWS_PER_DATASET) return;

    const rowObj = {};
    let hasAnyValue = false;

    colIndexToHeader.forEach((header, colIndex) => {
      const cell = row.getCell(colIndex);
      let cellValue = cell.value;

      // Handle formula cells by taking result
      if (cellValue && typeof cellValue === 'object' && 'result' in cellValue) {
        cellValue = cellValue.result;
      }

      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        hasAnyValue = true;
      }
      rowObj[header] = cellValue;
    });

    if (hasAnyValue) {
      rows.push(rowObj);
    }
  });

  return { headers, rows };
}

/**
 * Unified parser inspecting file extension and mimetype.
 *
 * @param {{ buffer: Buffer, originalname: string, mimetype: string }} file
 * @returns {Promise<{ headers: string[], rows: Record<string, unknown>[] }>}
 */
export async function parseUploadedFile(file) {
  const ext = file.originalname.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parseCsvBuffer(file.buffer);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcelBuffer(file.buffer);
  }

  throw badRequest('Unsupported file type. Please upload a .csv or .xlsx file');
}
