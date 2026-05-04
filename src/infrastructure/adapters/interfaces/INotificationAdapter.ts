/**
 * Browser notification adapter — minimal surface for showing and dismissing
 * system notifications by id.
 */
export interface INotificationAdapter {
  showNotification(id: string, msg: string): void;
  clearNotification(id: string): void;
}
