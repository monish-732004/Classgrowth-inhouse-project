import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { requestNotificationPermission, onMessageListener } from '@/lib/webpush';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '../hooks/use-user';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

const isBrowser = typeof window !== 'undefined';

export const NotificationPermission = () => {
  const { user } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, category, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const setupMessageListener = () => {
    onMessageListener()
      .then((payload: any) => {
        console.log('Message received in component:', payload);
        setUnreadCount(prev => prev + 1);
        fetchNotifications(); // Refresh notifications when a new one is received
      })
      .catch(err => console.error('Error in message listener:', err));
  };

  useEffect(() => {
    // Check if notifications are supported
    const checkNotificationSupport = async () => {
      if (!isBrowser) return false;
      
      try {
        // Check basic notification support
        const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
        setIsSupported(supported);
        
        if (supported) {
          // Check if service worker is registered and ready
          const registration = await navigator.serviceWorker.ready;
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Check notification permission
          if (Notification.permission === 'granted') {
            setIsSubscribed(true);
            setupMessageListener();
          }
        }
      } catch (error) {
        console.error('Error checking notification support:', error);
      }
    };

    checkNotificationSupport();
  }, [toast]);

  const handleToggleNotifications = async (e?: React.MouseEvent) => {
    // Stop event propagation if it's from a click event
    if (e) {
      e.stopPropagation();
    }

    if (!isBrowser) return;

    if (isSubscribed) {
      // Toggle off
      setIsSubscribed(false);
      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive browser notifications',
      });
      return;
    }

    // Toggle on
    if (!('Notification' in window)) {
      toast({
        title: 'Notifications not supported',
        description: 'Your browser does not support notifications',
        variant: 'destructive',
      });
      return;
    }

    if (!('serviceWorker' in navigator)) {
      toast({
        title: 'Service Worker not supported',
        description: 'Your browser does not support service workers which are required for notifications',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Get FCM token
        const token = await requestNotificationPermission();
        
        if (token) {
          setIsSubscribed(true);
          setupMessageListener();
          toast({
            title: 'Notifications enabled',
            description: 'You will now receive important updates',
          });
        } else {
          throw new Error('Failed to get FCM token');
        }
      } else if (permission === 'denied') {
        toast({
          title: 'Notifications blocked',
          description: 'Allow notifications in your browser site settings to enable this.',
        });
        return;
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      fetchNotifications();
      setUnreadCount(0);
    }
    setIsOpen(!isOpen);
  };

  if (!isSupported) {
    return null; // Don't render anything if notifications aren't supported
  }
  
  // Only show the notification bell if the user is an admin


  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-muted/50 transition-colors"
          onClick={handleBellClick}
          aria-label={isSubscribed ? 'View notifications' : 'Enable notifications'}
          title={isSubscribed ? 'View notifications' : 'Enable notifications'}
        >
          {isLoading ? (
            <span className="animate-spin">⏳</span>
          ) : isSubscribed ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-72 p-0" align="end" sideOffset={10}>
        <div className="p-2">
          <div className="flex items-center justify-between p-2 border-b">
            <h4 className="font-medium text-sm">Notifications</h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close notifications"
            >
              ✕
            </button>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      // Navigate to the relevant page or show details
                      console.log('Notification clicked:', notification.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        notification.category === 'Workshop' ? 'bg-blue-500' :
                        notification.category === 'Placement Info' ? 'bg-green-500' :
                        notification.category === 'Test Link' ? 'bg-yellow-500' :
                        notification.category === 'Tech News' ? 'bg-purple-500' : 'bg-gray-500'
                      }`} />
                      <span className="text-sm font-medium">{notification.category}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {notification.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-2 border-t text-center">
            <button
              onClick={handleToggleNotifications}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSubscribed ? 'Disable notifications' : 'Enable notifications'}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPermission;
