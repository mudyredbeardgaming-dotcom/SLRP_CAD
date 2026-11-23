import { promises as fs } from 'fs';
import path from 'path';

/**
 * Server-side access to data/cad-data.json.
 *
 * - Every read-modify-write goes through `withDataLock`, so CAD saves and
 *   FiveM updates (lib/fivem/characters.ts) never interleave.
 * - Writes go to a temp file first and are then renamed into place, so a
 *   reader never sees a half-written file.
 */

export const DATA_DIR = path.join(process.cwd(), 'data');
export const DATA_FILE = path.join(DATA_DIR, 'cad-data.json');

let chain: Promise<unknown> = Promise.resolve();

export function withDataLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** Returns the parsed data file, or null if it doesn't exist / can't be parsed. */
export async function readDataFile(): Promise<any | null> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export async function writeDataFile(data: any): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const json = JSON.stringify(data, null, 2);
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  try {
    await fs.writeFile(tmp, json, 'utf-8');
    await fs.rename(tmp, DATA_FILE);
  } catch {
    // Some filesystems (e.g. Windows with the file open) refuse the rename; fall back.
    await fs.writeFile(DATA_FILE, json, 'utf-8');
    await fs.rm(tmp, { force: true }).catch(() => {});
  }
}
