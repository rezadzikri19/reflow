import * as XLSX from 'xlsx';
import type { ReactNode } from 'react';
import type { FlowchartNode } from '../types';
import type { NodeConnectionsMap } from '../hooks/useNodeConnections';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'xlsx' | 'csv' | 'json' | 'xml';

export interface TableExportOptions {
  filename?: string;
  /** Map of nodeId to breadcrumb path (e.g., "Subprocess A > Subprocess B") */
  hierarchyMap?: Map<string, string>;
}

/** Context passed to column accessors for additional information */
export interface AccessorContext {
  /** Map of nodeId to breadcrumb path (e.g., "Subprocess A > Subprocess B") */
  hierarchyMap?: Map<string, string>;
}

export interface ColumnDef {
  key: string;
  label: string;
  accessor: (node: FlowchartNode, connections: NodeConnectionsMap, context?: AccessorContext) => ReactNode;
}

// ============================================================================
// Text Extraction
// ============================================================================

/**
 * Extract plain text value from React elements
 * Handles spans, arrays, title props, and nested elements
 */
function extractTextValue(node: ReactNode): string {
  if (node === null || node === undefined) {
    return '';
  }

  if (typeof node === 'string') {
    return node;
  }

  if (typeof node === 'number') {
    return String(node);
  }

  if (typeof node === 'boolean') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractTextValue).join(', ');
  }

  if (typeof node === 'object' && 'props' in node) {
    const element = node as React.ReactElement;
    const props = element.props as Record<string, unknown>;

    // Check for title prop (used in truncated text with tooltips)
    if (props.title && typeof props.title === 'string') {
      return props.title;
    }

    // Check for children
    if (props.children !== undefined) {
      return extractTextValue(props.children as ReactNode);
    }
  }

  return '';
}

// ============================================================================
// Data Preparation
// ============================================================================

/**
 * Prepare table data for export with hierarchy information
 * Returns headers and rows as plain text values
 */
function prepareTableData(
  nodes: FlowchartNode[],
  connections: NodeConnectionsMap,
  columns: ColumnDef[],
  hierarchyMap?: Map<string, string>
): { headers: string[]; rows: string[][] } {
  // Build accessor context
  const context: AccessorContext | undefined = hierarchyMap ? { hierarchyMap } : undefined;

  // Add all column headers
  const headers = columns.map((col) => col.label);

  const rows = nodes.map((node) => {
    const row: string[] = [];

    // Add column values (accessor will include hierarchy in label if context is provided)
    columns.forEach((col) => {
      const value = col.accessor(node, connections, context);
      row.push(extractTextValue(value));
    });

    return row;
  });

  return { headers, rows };
}

// ============================================================================
// Download Helper
// ============================================================================

/**
 * Trigger browser download for a blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Format Exporters
// ============================================================================

/**
 * Export data to Excel format (XLSX)
 */
function exportToExcel(
  headers: string[],
  rows: string[][],
  filename: string
): void {
  const data: (string | number)[][] = [headers, ...rows];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths based on content
  const colWidths = headers.map((header, index) => {
    // Find max width needed for this column
    const headerLen = header.length;
    const maxDataLen = Math.max(
      ...rows.slice(0, 100).map((row) => (row[index] || '').length)
    );
    return { wch: Math.max(headerLen, maxDataLen, 10) + 2 };
  });
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Nodes');
  XLSX.writeFile(workbook, filename);
}

/**
 * Export data to CSV format
 * Uses UTF-8 with BOM for Excel compatibility
 */
function exportToCSV(
  headers: string[],
  rows: string[][],
  filename: string
): void {
  const escapeCSVField = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvLines = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((row) => row.map(escapeCSVField).join(',')),
  ];

  const csvContent = csvLines.join('\r\n');

  // Add UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

  downloadBlob(blob, filename);
}

/**
 * Export data to JSON format
 * Includes metadata about the export
 */
function exportToJSON(
  headers: string[],
  rows: string[][],
  filename: string
): void {
  const data = rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });

  const exportData = {
    exportedAt: new Date().toISOString(),
    totalNodes: data.length,
    nodes: data,
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });

  downloadBlob(blob, filename);
}

/**
 * Export data to XML format
 */
function exportToXML(
  headers: string[],
  rows: string[][],
  filename: string
): void {
  const escapeXML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Create safe XML tag names from headers
  const safeTagNames = headers.map((header) => {
    return header
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$0')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  });

  const xmlNodes = rows.map((row) => {
    const fields = row.map((value, index) => {
      const tagName = safeTagNames[index] || `field_${index}`;
      return `    <${tagName}>${escapeXML(value)}</${tagName}>`;
    });
    return `  <node>\n${fields.join('\n')}\n  </node>`;
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nodes>
${xmlNodes.join('\n')}
</nodes>`;

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });

  downloadBlob(blob, filename);
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export table data in the specified format with hierarchy information
 *
 * @param nodes - Array of flowchart nodes to export
 * @param connections - Map of node connections
 * @param columns - Column definitions with accessors
 * @param format - Export format (xlsx, csv, json, xml)
 * @param options - Export options including custom filename and hierarchy map
 */
export function exportTableData(
  nodes: FlowchartNode[],
  connections: NodeConnectionsMap,
  columns: ColumnDef[],
  format: ExportFormat,
  options?: TableExportOptions
): void {
  if (nodes.length === 0) {
    console.warn('No nodes to export');
    return;
  }

  const { headers, rows } = prepareTableData(
    nodes,
    connections,
    columns,
    options?.hierarchyMap
  );

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const extension = format === 'xlsx' ? 'xlsx' : format;
  const defaultFilename = `node-list-${date}.${extension}`;
  const filename = options?.filename || defaultFilename;

  switch (format) {
    case 'xlsx':
      exportToExcel(headers, rows, filename);
      break;
    case 'csv':
      exportToCSV(headers, rows, filename);
      break;
    case 'json':
      exportToJSON(headers, rows, filename);
      break;
    case 'xml':
      exportToXML(headers, rows, filename);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
