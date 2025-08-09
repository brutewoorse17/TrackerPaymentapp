import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function getDaysOverdue(dueDate: string | Date): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today.getTime() - due.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

async function downloadFileNative(data: string, filename: string, mime: string): Promise<void> {
  try {
    const { Filesystem } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const base64Data = typeof atob === 'function'
      ? btoa(unescape(encodeURIComponent(data)))
      : Buffer.from(data, 'utf8').toString('base64');

    const writeResult = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: 'DOCUMENTS',
      recursive: true,
    });

    try {
      await Share.share({
        title: filename,
        text: 'Exported file',
        url: writeResult.uri,
        dialogTitle: 'Share export',
      });
    } catch {
      // If Share not available, nothing else to do
    }
  } catch (err) {
    // Fallback to browser download
    const blob = new Blob([data], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

export async function downloadCSV(data: string, filename: string): Promise<void> {
  const isAndroidWebView = /Android/i.test(navigator.userAgent);
  if (isAndroidWebView) {
    await downloadFileNative(data, filename, 'text/csv');
    return;
  }
  const blob = new Blob([data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  a.click();
  window.URL.revokeObjectURL(url);
}
