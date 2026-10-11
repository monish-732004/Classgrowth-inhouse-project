import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, ArrowRight, Zap, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import heroBg from "@/assets/hero-bg.jpg";
import { getTheme, applyTheme } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  useEffect(() => {
    applyTheme(getTheme() || "light");
  }, [navigate]);
  const navigateProperly = () => {
    if(supabase.auth.getUser){
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden pt-20"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container mx-auto px-4 text-center text-white relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
            ClassGrowth
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-gray-100">
            Your personalized information hub for workshops, placements, tests, and industry updates
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>


      {/* About Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          About ClassGrowth
        </h2>
        <div className="prose prose-lg text-gray-600 dark:prose-invert dark:text-gray-300 max-w-none mx-auto">
          <p>
            ClassGrowth is a smart, minimal app that centralizes all updates from our Faculty Advisor. 
            Dr A Prabhu Chakkaravarthy will post workshops, placements, tests, tech news, and industry updates with a short title, 
            summary, and link. Students log in with their SRM email, select their interests, and get a clean, 
            personalized feed of relevant notifications. Each post interaction is saved in their history for easy reference. 
            ClassGrowth keeps students informed, organized, and connected to opportunities that matter most.
          </p>
          <p className="mt-4">
            Our mission is to bridge the gap between faculty and students, ensuring that important information 
            is easily accessible and never missed. With a clean, intuitive interface, ClassGrowth makes it simple 
            to stay on top of all academic and professional development opportunities.
          </p>
        </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to stay connected?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join ClassGrowth and never miss important updates again
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigateProperly()}
            className="text-lg px-8"
          >
            Sign Up Now <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-card border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>By the U1 For the U1 To the U1</p>
          <p className="mt-4">&copy; 2025 ClassGrowth. All rights reserved by R.Monish</p>
          <div className="mt-4 text-sm text-gray-400">
            <p>Debug: Check browser console for notification logs</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface Notification {
  id: string;
  title: string;
  summary: string;
  category: string;
  link: string;
  created_at: string;
}

const NotificationPermissionButton = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotifications(data || []);
      
      // Update unread count based on last fetched time
      if (lastFetched && data) {
        const newNotifications = data.filter(
          (n: any) => new Date(n.created_at) > lastFetched
        );
        setUnreadCount(prev => prev + newNotifications.length);
      }
      
      setLastFetched(new Date());
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    // Check if notifications are supported and already enabled
    const checkNotificationSupport = () => {
      if (typeof window === 'undefined') return;
      
      const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        if (Notification.permission === 'granted') {
          setIsSubscribed(true);
          setupMessageListener();
        }
        // Initial fetch of notifications
        fetchNotifications();
        // Set up polling for new notifications (every 5 minutes)
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
      }
    };
    
    checkNotificationSupport();
  }, []);

  const setupMessageListener = () => {
    onMessageListener()
      .then((payload: any) => {
        console.log('Message received in component:', payload);
        toast({
          title: payload?.notification?.title || 'New Notification',
          description: payload?.notification?.body || 'You have a new notification',
          duration: 5000,
        });
      })
      .catch(err => console.error('Error in message listener:', err));
  };

  const handleSubscribe = async (e?: React.MouseEvent) => {
    try {
      setIsLoading(true);
      console.log('Requesting notification permission...');
      const token = await requestNotificationPermission();
      
      if (token) {
        setIsSubscribed(true);
        setupMessageListener();
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive notifications',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to enable notifications. Please check console for details.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications. Please check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  const toggleNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubscribed) {
      // If already subscribed, clicking will show/hide notifications
      setShowNotifications(!showNotifications);
      if (!showNotifications) {
        // If opening notifications, mark all as read
        setUnreadCount(0);
      }
    } else {
      // If not subscribed, handle subscription
      handleSubscribe(e);
    }
  };

  const handleCloseNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNotifications(false);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleNotifications}
        disabled={!isNotificationSupported}
        className={`p-2 rounded-full relative ${
          isSubscribed 
            ? 'text-primary hover:bg-primary/10' 
            : 'text-muted-foreground hover:bg-muted'
        } transition-colors`}
        title={
          !isNotificationSupported 
            ? 'Notifications not supported in your browser' 
            : isSubscribed 
              ? 'View notifications' 
              : 'Enable notifications'
        }
      >
        {isLoading ? (
          <span className="animate-spin">⏳</span>
        ) : isSubscribed ? (
          <>
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        ) : (
          <BellOff className="h-6 w-6" />
        )}
      </button>

      {/* Notifications Popup */}
      {isSubscribed && showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-background rounded-lg shadow-lg border overflow-hidden z-50">
          <div className="p-3 border-b flex justify-between items-center">
            <h3 className="font-medium">Notifications</h3>
            <button 
              onClick={handleCloseNotifications}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close notifications"
            >
              ✕
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <a
                  key={notification.id}
                  href={notification.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                  onClick={handleCloseNotifications}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className={`h-2 w-2 rounded-full ${
                        notification.category === 'Workshop' ? 'bg-blue-500' :
                        notification.category === 'Placement Info' ? 'bg-green-500' :
                        notification.category === 'Test Link' ? 'bg-yellow-500' :
                        notification.category === 'Tech News' ? 'bg-purple-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium">{notification.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.summary}
                      </p>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          notification.category === 'Workshop' ? 'bg-blue-100 text-blue-800' :
                          notification.category === 'Placement Info' ? 'bg-green-100 text-green-800' :
                          notification.category === 'Test Link' ? 'bg-yellow-100 text-yellow-800' :
                          notification.category === 'Tech News' ? 'bg-purple-100 text-purple-800' : 
                          'bg-gray-100 text-gray-800'
                        }">
                          {notification.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 border-t text-center">
              <a 
                href="/dashboard" 
                className="text-sm text-primary hover:underline"
                onClick={handleCloseNotifications}
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
      
      {!isNotificationSupported && (
        <p className="text-xs text-muted-foreground mt-1">Notifications not supported in your browser</p>
      )}
    </div>
  );
};

export default Index;
