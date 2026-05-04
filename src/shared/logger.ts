/** Options for logger creation. */
export interface LoggerOptions {
  readonly production?: boolean;
}

/** Scoped logger that prefixes all messages with the context name. */
export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
}

/** Creates a scoped logger. Suppresses debug/info in production mode. */
export function createLogger(context: string, options: LoggerOptions = {}): Logger {
  const prefix = `[${context}]`;
  const isProd =
    options.production ??
    (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'production');

  return {
    debug(message: string, data?: unknown): void {
      if (isProd) return;
      console.debug(prefix, message, data);
    },
    info(message: string, data?: unknown): void {
      if (isProd) return;
      console.info(prefix, message, data);
    },
    warn(message: string, data?: unknown): void {
      console.warn(prefix, message, data);
    },
    error(message: string, error?: unknown): void {
      console.error(prefix, message, error);
    },
  };
}
