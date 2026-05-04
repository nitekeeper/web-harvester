/**
 * Clipboard adapter — reads from and writes to the system clipboard, isolated
 * behind an interface so contexts without DOM clipboard access can stub it.
 */
export interface IClipboardAdapter {
  writeText(text: string): Promise<void>;
  readText(): Promise<string>;
}
