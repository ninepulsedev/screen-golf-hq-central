import React, { useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, notification.duration || 5000);

    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'info':
      return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-pulse">
      <div className={`p-4 rounded-lg shadow-lg border ${getColors()} backdrop-blur-sm`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold mb-1">{notification.title}</h4>
            <p className="text-sm opacity-90">{notification.message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
          >
            <XMarkIcon className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
