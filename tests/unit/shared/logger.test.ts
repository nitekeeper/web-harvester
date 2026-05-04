/* eslint-disable no-console -- this file tests the logger which wraps console methods */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createLogger } from '@shared/logger';

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createLogger — message formatting', () => {
  it('prefixes messages with the context name', () => {
    const logger = createLogger('my-plugin');
    logger.info('hello world');
    expect(console.info).toHaveBeenCalledWith('[my-plugin]', 'hello world', undefined);
  });

  it('includes optional data in the output', () => {
    const logger = createLogger('test');
    logger.debug('msg', { key: 'val' });
    expect(console.debug).toHaveBeenCalledWith('[test]', 'msg', { key: 'val' });
  });

  it('passes data to warn', () => {
    const logger = createLogger('test');
    logger.warn('something odd', { code: 42 });
    expect(console.warn).toHaveBeenCalledWith('[test]', 'something odd', { code: 42 });
  });

  it('passes error to error', () => {
    const logger = createLogger('test');
    const err = new Error('boom');
    logger.error('failed', err);
    expect(console.error).toHaveBeenCalledWith('[test]', 'failed', err);
  });
});

describe('createLogger — production mode', () => {
  it('suppresses debug and info in production mode', () => {
    const logger = createLogger('test', { production: true });
    logger.debug('hidden');
    logger.info('also hidden');
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });

  it('always outputs warn and error even in production', () => {
    const logger = createLogger('test', { production: true });
    logger.warn('visible');
    logger.error('also visible');
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('outputs debug and info in development mode (default)', () => {
    const logger = createLogger('test', { production: false });
    logger.debug('visible debug');
    logger.info('visible info');
    expect(console.debug).toHaveBeenCalledWith('[test]', 'visible debug', undefined);
    expect(console.info).toHaveBeenCalledWith('[test]', 'visible info', undefined);
  });
});
