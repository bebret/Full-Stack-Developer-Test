import fs from 'node:fs';
import path from 'node:path';
import { serverRoot } from './paths.js';

const logDir = path.join(serverRoot, 'logs');
const logFile = path.join(logDir, 'app.log');

fs.mkdirSync(logDir, { recursive: true });

function write(level, message, meta = {}) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...meta,
  });

  if (level === 'error') console.error(line);
  else console.log(line);

  fs.appendFileSync(logFile, `${line}\n`);
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  file: logFile,
};
