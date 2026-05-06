export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; // in ms, 0 means no auto-close
}

type NotificationListener = (notification: Notification) => void;

class NotificationService {
  private listeners: Set<NotificationListener> = new Set();
  private notifications: Map<string, Notification> = new Map();

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      Array.from(this.notifications.values()).forEach(listener);
    });
  }

  show(message: string, type: NotificationType = 'info', duration: number = 4000) {
    const id = Math.random().toString(36).slice(2);
    const notification: Notification = {
      id,
      message,
      type,
      duration
    };
    
    this.notifications.set(id, notification);
    this.notifyListeners();

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  success(message: string, duration: number = 4000) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 5000) {
    return this.show(message, 'error', duration);
  }

  warning(message: string, duration: number = 4000) {
    return this.show(message, 'warning', duration);
  }

  info(message: string, duration: number = 4000) {
    return this.show(message, 'info', duration);
  }

  dismiss(id: string) {
    this.notifications.delete(id);
    this.notifyListeners();
  }

  dismissAll() {
    this.notifications.clear();
    this.notifyListeners();
  }
}

export const notificationService = new NotificationService();
