import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { notificationService, Notification } from '@/services/notificationService';

export const NotificationContainer = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(prev => {
        const exists = prev.find(n => n.id === notification.id);
        if (exists) {
          return prev.map(n => n.id === notification.id ? notification : n);
        }
        return [...prev, notification];
      });

      if (notification.duration === 0) {
        // Don't auto-remove if duration is 0
      }
    });

    return unsubscribe;
  }, []);

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    notificationService.dismiss(id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} className="text-emerald-500" />;
      case 'error':
        return <AlertCircle size={24} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={24} className="text-amber-500" />;
      case 'info':
      default:
        return <Info size={24} className="text-blue-500" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-900',
          titleColor: 'text-emerald-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
          titleColor: 'text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-900',
          titleColor: 'text-amber-700'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-900',
          titleColor: 'text-blue-700'
        };
    }
  };

  // Séparer les notifications critiques des notifications normales
  const criticalNotifications = notifications.filter(n => ['error', 'warning'].includes(n.type));
  const normalNotifications = notifications.filter(n => !['error', 'warning'].includes(n.type));

  // Render modales centrées pour les notifications critiques
  const criticalModals = criticalNotifications.map(notification => {
    const styles = getStyles(notification.type);
    return createPortal(
      <AnimatePresence key={notification.id}>
        {notifications.find(n => n.id === notification.id) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => dismiss(notification.id)}
          >
            <motion.div
              className={`${styles.bg} border-2 ${styles.border} ${styles.text} w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8 space-y-4`}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <h3 className={`font-black text-lg uppercase tracking-tight mb-2 ${styles.titleColor}`}>
                    {notification.type === 'error' ? 'Erreur' : 'Attention'}
                  </h3>
                  <p className="text-sm leading-relaxed">{notification.message}</p>
                </div>
                <button
                  onClick={() => dismiss(notification.id)}
                  className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => dismiss(notification.id)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-sm uppercase transition-all hover:opacity-80"
                  style={{
                    backgroundColor: notification.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                    color: notification.type === 'error' ? '#dc2626' : '#b45309'
                  }}
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  });

  // Render toasts normaux en bas à droite
  const normalToasts = (
    <div className="fixed bottom-8 right-8 z-[10000] space-y-3 pointer-events-none">
      <AnimatePresence>
        {normalNotifications.map(notification => {
          const styles = getStyles(notification.type);
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, y: 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 100, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 shadow-xl pointer-events-auto max-w-md ${styles.bg} ${styles.border} ${styles.text}`}
            >
              <div className="flex-shrink-0">
                {getIcon(notification.type)}
              </div>
              <p className="text-sm font-semibold flex-1">{notification.message}</p>
              <button
                onClick={() => dismiss(notification.id)}
                className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity"
              >
                <X size={18} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {criticalModals}
      {normalToasts}
    </>
  );
};
