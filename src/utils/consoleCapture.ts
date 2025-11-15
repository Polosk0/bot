import { createWriteStream, existsSync, mkdirSync, WriteStream } from 'fs';
import { join } from 'path';
import { format } from 'util';

let captureStream: WriteStream | null = null;
let captureFilePath: string | null = null;
let captureInitialized = false;

type ConsoleMethod = (...args: unknown[]) => void;

const wrapConsoleMethod = (
  original: ConsoleMethod,
  level: string
): ((...args: unknown[]) => void) => {
  return (...args: unknown[]) => {
    if (captureStream) {
      const message = format(...args);
      const timestamp = new Date().toISOString();
      captureStream.write(`[${timestamp}] [${level}] ${message}\n`);
    }
    original(...args);
  };
};

export function startConsoleCapture(): string | null {
  if (captureInitialized) {
    return captureFilePath;
  }

  captureInitialized = true;

  const logsDir = join(process.cwd(), 'logs', 'sessions');
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  const sessionId = new Date().toISOString().replace(/[:.]/g, '-');
  captureFilePath = join(logsDir, `session-${sessionId}.log`);
  captureStream = createWriteStream(captureFilePath, { flags: 'a' });

  const originalLog = console.log.bind(console);
  const originalInfo = console.info.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalDebug = console.debug.bind(console);

  console.log = wrapConsoleMethod(originalLog, 'LOG');
  console.info = wrapConsoleMethod(originalInfo, 'INFO');
  console.warn = wrapConsoleMethod(originalWarn, 'WARN');
  console.error = wrapConsoleMethod(originalError, 'ERROR');
  console.debug = wrapConsoleMethod(originalDebug, 'DEBUG');

  const closeStream = () => {
    if (captureStream) {
      captureStream.end();
      captureStream = null;
    }
  };

  process.on('exit', closeStream);

  originalLog(`[CAPTURE] Terminal logs are saved to ${captureFilePath}`);

  return captureFilePath;
}

