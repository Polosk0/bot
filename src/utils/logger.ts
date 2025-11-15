import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export class Logger {
  private logStream: WriteStream;
  private errorStream: WriteStream;

  constructor() {
    const logDir = join(process.cwd(), 'logs');
    this.logStream = createWriteStream(join(logDir, 'bot.log'), { flags: 'a' });
    this.errorStream = createWriteStream(join(logDir, 'error.log'), { flags: 'a' });
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  private writeToFile(stream: WriteStream, formattedMessage: string) {
    stream.write(formattedMessage + '\n');
  }

  info(message: string, ...args: any[]) {
    const formatted = this.formatMessage('INFO', message, ...args);
    console.log(formatted);
    this.writeToFile(this.logStream, formatted);
  }

  warn(message: string, ...args: any[]) {
    const formatted = this.formatMessage('WARN', message, ...args);
    console.warn(formatted);
    this.writeToFile(this.logStream, formatted);
  }

  error(message: string, ...args: any[]) {
    const formatted = this.formatMessage('ERROR', message, ...args);
    console.error(formatted);
    this.writeToFile(this.errorStream, formatted);
  }

  debug(message: string, ...args: any[]) {
    const formatted = this.formatMessage('DEBUG', message, ...args);
    console.debug(formatted);
    this.writeToFile(this.logStream, formatted);
  }

  close() {
    this.logStream.end();
    this.errorStream.end();
  }
}

export const logger = new Logger();



























