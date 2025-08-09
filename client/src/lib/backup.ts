import { exportDbJson, importDbJson } from "./offlineDb";

export type StorageLocation = "documents" | "data";

function toDirectory(location: StorageLocation): 'DOCUMENTS' | 'DATA' {
  return location === 'documents' ? 'DOCUMENTS' : 'DATA';
}

export async function saveTextFile(filename: string, data: string, mime: string, location: StorageLocation = 'data'): Promise<string> {
  const { Filesystem } = await import('@capacitor/filesystem');
  const base64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(data))) : Buffer.from(data, 'utf8').toString('base64');
  const writeResult = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: toDirectory(location),
    recursive: true,
  });
  return writeResult.uri;
}

export async function backupToFile(filename: string, location: StorageLocation = 'documents'): Promise<string> {
  const { Filesystem } = await import('@capacitor/filesystem');
  const json = exportDbJson();
  const base64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, 'utf8').toString('base64');
  const writeResult = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: toDirectory(location),
    recursive: true,
  });
  return writeResult.uri;
}

export async function restoreFromFile(path: string, location?: StorageLocation): Promise<void> {
  const { Filesystem } = await import('@capacitor/filesystem');
  const result = await Filesystem.readFile({ path, directory: location ? toDirectory(location) : undefined });
  const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(result.data))) : Buffer.from(result.data, 'base64').toString('utf8');
  importDbJson(json);
}

export async function pickAndRestore(): Promise<void> {
  try {
    const { Filesystem } = await import('@capacitor/filesystem');
    // Capacitor Filesystem doesn't provide a native picker; we can accept a hardcoded path or integrate a plugin later.
    // For now, try a default file in Documents
    const defaultPath = 'payment-tracker-backup.json';
    const data = await Filesystem.readFile({ path: defaultPath, directory: 'DOCUMENTS' });
    const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(data.data))) : Buffer.from(data.data, 'base64').toString('utf8');
    importDbJson(json);
  } catch (err) {
    throw new Error('Restore failed: ' + (err as Error).message);
  }
}