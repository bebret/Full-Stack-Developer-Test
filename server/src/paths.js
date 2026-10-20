import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const srcDir = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(srcDir, '..');
