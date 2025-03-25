import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

export const getInvoice = createAction({
  id: 'redo_action_get-invoice',
  name: 'Get Invoice',
  description: 'Get an invoice as CSV and parse it',
  inputConfig: [
    {
      id: 'invoiceId',
      label: 'Invoice ID',
      description: 'The ID of the invoice to retrieve',
      placeholder: 'Enter invoice ID',
      inputType: 'text',
      required: {
        missingMessage: 'Invoice ID is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parseData',
      label: 'Parse CSV Data',
      description: 'Whether to parse the CSV data into JSON format',
      inputType: 'switch',
      switchOptions: {
        checked: 'Yes',
        unchecked: 'No',
        defaultChecked: false,
      },
    },
  ],
  aiSchema: z.object({
    invoiceId: z.string().describe('Invoice ID'),
    parseData: z
      .enum(['Yes', 'No'])
      .describe('Whether to parse the CSV data into JSON format'),
  }),
  run: async ({ connection, http, configValue, workspaceId }) => {
    const { apiKey } = connection;
    const { invoiceId, parseData } = configValue;

    const url = `https://api.getredo.com/v2.2/invoices/${invoiceId}/items.csv`;

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'text/csv, application/problem+json',
    };

    const response = await http.request({
      method: 'GET',
      url,
      workspaceId,
      headers,
    });

    // Get the CSV data from the response
    const csvData = response.data;

    // If parseData is false, return the raw CSV data
    if (parseData !== 'Yes') {
      return { rawCsv: csvData };
    }

    // Parse CSV data into JSON
    const parsedData = parseCsv(csvData);

    return {
      parsedData,
      rawCsv: csvData,
    };
  },
  mockRun: async ({ configValue }) => {
    const { parseData } = configValue;

    // Sample CSV data
    const mockCsvData = `id,order_id,item_name,quantity,price,currency,status,created_at
inv_item_123,order_456,Premium Widget,2,25.00,USD,shipped,2023-01-15T14:30:00Z
inv_item_124,order_456,Deluxe Gadget,1,75.20,USD,shipped,2023-01-15T14:30:00Z
inv_item_125,order_789,Standard Tool,3,15.75,USD,pending,2023-01-16T09:45:00Z`;

    if (parseData !== 'Yes') {
      return { rawCsv: mockCsvData };
    }

    // Parse the mock CSV data
    const parsedData = parseCsv(mockCsvData);

    return {
      parsedData,
      rawCsv: mockCsvData,
    };
  },
});

/**
 * Parse CSV data into an array of objects
 * This handles basic CSV parsing including quoted fields with commas
 */
function parseCsv(csvData: string) {
  // Split the CSV data into lines
  const lines = csvData.trim().split('\n');

  // Exit early if there's no data
  if (lines.length === 0) return [];

  // Extract headers from the first line
  const headers = parseCSVLine(lines[0]);

  // Process data rows
  const result = lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return row;
  });

  return result;
}

/**
 * Parse a single CSV line, handling quoted fields that may contain commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes (two double quotes in a row)
      if (i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      // Add character to current field
      current += char;
    }
  }

  // Add the last field
  result.push(current.trim());

  return result;
}
