import { execSync } from 'node:child_process';

/** Returns the build stamp: CI env override → git date-hash → 'dev' fallback. */
export function resolveBuildStamp(): string {
  // Empty string means "not set" — fall through to git hash
  if (process.env.VITE_BUILD) return process.env.VITE_BUILD;
  try {
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    return `${date}-${hash}`;
  } catch {
    return 'dev';
  }
}
