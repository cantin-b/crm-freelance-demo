import Papa from "papaparse";
import { CSV_COLUMNS } from "./constants";

export type CsvRow = Record<string, string>;

export function parseCsv(file: File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });
}

export function normalizeCsvRow(row: CsvRow): Partial<Record<(typeof CSV_COLUMNS)[number], string>> {
  const normalized: Record<string, string> = {};
  for (const col of CSV_COLUMNS) {
    if (row[col] !== undefined) {
      normalized[col] = row[col].trim();
    }
  }
  return normalized;
}
