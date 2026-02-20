import { useState } from 'react';
import { X, Bell } from 'lucide-react';

interface Notification {
  id: string;
  text: string;
  time: string;
  isRead: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    text: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem eaque ipsa quae ab illo inventore.',
    time: '20 Minutes Later',
    isRead: false,
  },
  {
    id: '2',
    text: 'Wed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.',
    time: '30 Minutes Later',
    isRead: false,
  },
  {
    id: '3',
    text: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas.',
    time: '40 Minutes Later',
    isRead: false,
  },
  {
    id: '4',
    text: 'At vero eos et accusamus et iusto dignissimos ducimus qui blanditiis.',
    time: '50 Minutes Later',
    isRead: false,
  },
  {
    id: '5',
    text: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem eaque ipsa quae ab illo inventore.',
    time: '20 Minutes Later',
    isRead: true,
  },
  {
    id: '6',
    text: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas.',
    time: '30 Minutes Later',
    isRead: true,
  },
];

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notification</h1>
        <button
          onClick={handleMarkAllRead}
          className="text-orange-500 hover:text-orange-600 font-medium text-sm transition-colors"
        >
          Mark All As Read
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-start gap-4 transition-all ${
              notification.isRead ? 'opacity-70' : ''
            }`}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                <Bell size={20} className="text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-relaxed">{notification.text}</p>
              <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => handleDismiss(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Bell size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Bildirishnomalar yo'q</p>
          </div>
        )}
      </div>
    </div>
  );
}
