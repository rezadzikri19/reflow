import * as XLSX from 'xlsx';

/**
 * Type definitions for the Excel parser utility
 */

export interface FlowchartNode {
  id: string;
  label: string;
  quantity?: number;
}

export interface ScenarioData {
  name: string;
  quantities: Record<string, number>; // nodeId -> quantity
}

export interface ImportResult {
  scenarios: ScenarioData[];
  nodeLabels: string[]; // Ordered list of node labels from template
}

/**
 * Export quantities from multiple scenarios to an Excel file
 * Each scenario becomes a column, each node becomes a row
 *
 * @param scenarios - Array of scenario data objects
 * @param nodes - Array of flowchart nodes with labels
 * @param filename - Optional custom filename (default: 'quantities-export.xlsx')
 */
export function exportQuantitiesToExcel(
  scenarios: ScenarioData[],
  nodes: FlowchartNode[],
  filename: string = 'quantities-export.xlsx'
): void {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Build the data array with headers
  const headers = ['Node Label', ...scenarios.map(s => s.name)];
  const data: (string | number)[][] = [headers];

  // Add rows for each node
  nodes.forEach(node => {
    const row: (string | number)[] = [node.label];
    scenarios.forEach(scenario => {
      row.push(scenario.quantities[node.id] ?? node.quantity ?? 0);
    });
    data.push(row);
  });

  // Create worksheet from data
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 30 }, // Node Label column
    ...scenarios.map(() => ({ wch: 15 })), // Scenario columns
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Quantities');

  // Generate and download the file
  XLSX.writeFile(workbook, filename);
}

/**
 * Import quantities from an Excel file
 * Parses the file and returns scenario data with quantities
 *
 * @param file - The Excel file to import (File or Blob)
 * @returns Promise resolving to import result with scenarios and node labels
 */
export async function importQuantitiesFromExcel(file: File | Blob): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Failed to read file data');
        }

        // Parse the workbook
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('No worksheets found in the Excel file');
        }
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON array (array of arrays)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as (string | number)[][];

        if (jsonData.length < 1) {
          throw new Error('Excel file is empty');
        }

        // Extract headers (first row)
        const headers = jsonData[0] as string[];
        const scenarioNames = headers.slice(1);

        // Extract node labels (first column, skipping header)
        const nodeLabels: string[] = [];
        const rows = jsonData.slice(1);

        rows.forEach(row => {
          if (row[0] && typeof row[0] === 'string') {
            nodeLabels.push(row[0]);
          }
        });

        // Build scenarios with quantities
        const scenarios: ScenarioData[] = scenarioNames.map((name, colIndex) => {
          const quantities: Record<string, number> = {};

          rows.forEach((row, _rowIndex) => {
            const nodeLabel = row[0] as string;
            if (nodeLabel) {
              // Use node label as key (caller should map to actual node IDs)
              const value = row[colIndex + 1];
              quantities[nodeLabel] = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
            }
          });

          return {
            name: name || `Scenario ${colIndex + 1}`,
            quantities,
          };
        });

        resolve({
          scenarios,
          nodeLabels,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate an import template Excel file with node labels
 * Creates empty quantity columns for users to fill in
 *
 * @param nodes - Array of flowchart nodes with labels
 * @param scenarioCount - Number of scenario columns to include (default: 3)
 * @param filename - Optional custom filename (default: 'quantities-template.xlsx')
 */
export function generateImportTemplate(
  nodes: FlowchartNode[],
  scenarioCount: number = 3,
  filename: string = 'quantities-template.xlsx'
): void {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Build headers with empty scenario columns
  const scenarioHeaders = Array.from(
    { length: scenarioCount },
    (_, i) => `Scenario ${i + 1}`
  );
  const headers = ['Node Label', ...scenarioHeaders];

  // Build data rows with node labels and empty quantity cells
  const data: (string | number | undefined)[][] = [headers];

  nodes.forEach(node => {
    const row: (string | number | undefined)[] = [node.label];
    // Add empty cells for each scenario column
    for (let i = 0; i < scenarioCount; i++) {
      row.push(undefined);
    }
    data.push(row);
  });

  // Create worksheet from data
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 30 }, // Node Label column
    ...Array(scenarioCount).fill({ wch: 15 }), // Scenario columns
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  // Generate and download the file
  XLSX.writeFile(workbook, filename);
}

/**
 * Export data to a CSV file
 *
 * @param data - 2D array of data to export
 * @param filename - Name of the CSV file (default: 'export.csv')
 */
export function exportToCSV(
  data: (string | number | null | undefined)[][],
  filename: string = 'export.csv'
): void {
  // Convert data to CSV string
  const csvContent = data
    .map(row =>
      row.map(cell => {
        // Handle cells that need quoting
        if (cell === null || cell === undefined) {
          return '';
        }
        const cellString = String(cell);
        // Quote cells containing commas, quotes, or newlines
        if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
          return `"${cellString.replace(/"/g, '""')}"`;
        }
        return cellString;
      }).join(',')
    )
    .join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  // Check for IE-specific msSaveBlob (deprecated but kept for compatibility)
  const nav = navigator as Navigator & { msSaveBlob?: (blob: Blob, filename: string) => boolean };
  if (nav.msSaveBlob) {
    // IE 10+
    nav.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Export scenarios to CSV format
 * Convenience function that formats scenario data for CSV export
 *
 * @param scenarios - Array of scenario data objects
 * @param nodes - Array of flowchart nodes with labels
 * @param filename - Name of the CSV file (default: 'quantities-export.csv')
 */
export function exportQuantitiesToCSV(
  scenarios: ScenarioData[],
  nodes: FlowchartNode[],
  filename: string = 'quantities-export.csv'
): void {
  // Build headers
  const headers = ['Node Label', ...scenarios.map(s => s.name)];
  const data: (string | number)[][] = [headers];

  // Add rows for each node
  nodes.forEach(node => {
    const row: (string | number)[] = [node.label];
    scenarios.forEach(scenario => {
      row.push(scenario.quantities[node.id] ?? node.quantity ?? 0);
    });
    data.push(row);
  });

  exportToCSV(data, filename);
}

/**
 * Import quantities from a CSV file
 *
 * @param file - The CSV file to import
 * @returns Promise resolving to import result with scenarios and node labels
 */
export async function importQuantitiesFromCSV(file: File | Blob): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error('Failed to read file data');
        }

        // Parse CSV
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 1) {
          throw new Error('CSV file is empty');
        }

        // Parse CSV line (handle quoted values)
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (inQuotes) {
              if (char === '"') {
                if (line[i + 1] === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = false;
                }
              } else {
                current += char;
              }
            } else {
              if (char === '"') {
                inQuotes = true;
              } else if (char === ',') {
                result.push(current);
                current = '';
              } else {
                current += char;
              }
            }
          }
          result.push(current);
          return result;
        };

        // Extract headers
        const headers = parseCSVLine(lines[0]);
        const scenarioNames = headers.slice(1);

        // Extract node labels and data
        const nodeLabels: string[] = [];
        const scenarios: ScenarioData[] = scenarioNames.map(name => ({
          name: name || 'Unnamed Scenario',
          quantities: {},
        }));

        lines.slice(1).forEach(line => {
          const cells = parseCSVLine(line);
          const nodeLabel = cells[0];

          if (nodeLabel) {
            nodeLabels.push(nodeLabel);

            cells.slice(1).forEach((value, colIndex) => {
              if (scenarios[colIndex]) {
                scenarios[colIndex].quantities[nodeLabel] = parseFloat(value) || 0;
              }
            });
          }
        });

        resolve({
          scenarios,
          nodeLabels,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file'));
    };

    reader.readAsText(file);
  });
}
