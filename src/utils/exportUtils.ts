/**
 * Export utilities for CSV file generation and download
 */

export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any) => string;
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data: any[], columns: ExportColumn[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headers = columns.map(col => `"${col.label}"`).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];
      
      // Apply formatter if provided
      if (col.formatter && value !== null && value !== undefined) {
        value = col.formatter(value);
      }
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');
      
      return `"${stringValue}"`;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  return `${prefix}-export-${timestamp}.${extension}`;
}

/**
 * Format date for CSV export
 */
export function formatDateForExport(date: string | Date | null): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
  } catch (error) {
    return String(date);
  }
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number | null): string {
  if (amount === null || amount === undefined) return '';
  return `$${amount.toFixed(2)}`;
}

/**
 * Format boolean for export
 */
export function formatBooleanForExport(value: boolean | null): string {
  if (value === null || value === undefined) return '';
  return value ? 'Yes' : 'No';
}

/**
 * Format array for export (join with semicolons)
 */
export function formatArrayForExport(arr: any[] | null): string {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join('; ');
}

/**
 * Export data with loading state management
 */
export async function exportWithLoading<T>(
  fetchData: () => Promise<T[]>,
  columns: ExportColumn[],
  filename: string,
  onLoadingChange: (loading: boolean) => void,
  onSuccess?: (count: number) => void,
  onError?: (error: string) => void
): Promise<void> {
  try {
    onLoadingChange(true);
    
    const data = await fetchData();
    
    if (!data || data.length === 0) {
      onError?.('No data available to export');
      return;
    }
    
    const csvContent = arrayToCSV(data, columns);
    downloadCSV(csvContent, filename);
    
    onSuccess?.(data.length);
  } catch (error) {
    console.error('Export error:', error);
    onError?.(error instanceof Error ? error.message : 'Export failed');
  } finally {
    onLoadingChange(false);
  }
}

/**
 * Common export columns for different data types
 */
export const EXPORT_COLUMNS = {
  USERS: [
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'defaultMode', label: 'Default Mode' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'country', label: 'Country' },
    { key: 'zipcode', label: 'Zipcode' },
    { key: 'created_at', label: 'Registration Date', formatter: formatDateForExport },
    { key: 'updated_at', label: 'Last Updated', formatter: formatDateForExport }
  ] as ExportColumn[],
  
  SELLERS: [
    { key: 'store_name', label: 'Store Name' },
    { key: 'user_email', label: 'Email' },
    { key: 'user_name', label: 'Contact Name' },
    { key: 'description', label: 'Description' },
    { key: 'user_phone', label: 'Phone' },
    { key: 'user_city', label: 'City' },
    { key: 'user_state', label: 'State' },
    { key: 'user_country', label: 'Country' },
    { key: 'features', label: 'Features', formatter: formatArrayForExport },
    { key: 'is_approved', label: 'Approved', formatter: formatBooleanForExport },
    { key: 'user_created_at', label: 'Registration Date', formatter: formatDateForExport }
  ] as ExportColumn[],
  
  INTERESTS: [
    { key: 'id', label: 'Interest ID' },
    { key: 'buyer_name', label: 'Buyer Name' },
    { key: 'buyer_email', label: 'Buyer Email' },
    { key: 'seller_name', label: 'Seller Name' },
    { key: 'listing_name', label: 'Product/Service' },
    { key: 'status', label: 'Status' },
    { key: 'message', label: 'Message' },
    { key: 'price', label: 'Price', formatter: formatCurrencyForExport },
    { key: 'created_at', label: 'Created Date', formatter: formatDateForExport },
    { key: 'updated_at', label: 'Last Updated', formatter: formatDateForExport }
  ] as ExportColumn[]
};
