/**
 * Keyboard command adapter — subscribes to user-invoked commands declared in
 * the extension manifest's `commands` section.
 */
export interface ICommandAdapter {
  onCommand(handler: (command: string) => void): void;
}
