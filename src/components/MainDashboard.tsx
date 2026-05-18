import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation, useParams, Outlet, Navigate, Link } from 'react-router-dom';
import { 
  MessageSquare, Star, Users, LayoutDashboard, Settings, X 
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { UserProfileModal } from './ui/UserProfileModal';
import { UserAvatar } from './ui/UserAvatar';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const MainDashboard = ({ user, setUser, onLogout }: { user: any, setUser: (u: any) => void, onLogout: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  // Derive active tab from path
  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/chats')) return 'chats';
    if (path.startsWith('/reviews')) return 'reviews';
    if (path.startsWith('/channels')) return 'channels';
    if (path.startsWith('/system')) return 'system';
    if (path.startsWith('/settings')) return 'settings';
    return 'chats';
  }, [location.pathname]);

  useEffect(() => {
    if (user?.theme) {
      document.documentElement.setAttribute('data-theme', user.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [user?.theme]);

  // Sync total unread count from profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiFetch(`/api/users/profile/${user.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.unreadCount !== undefined) setTotalUnread(data.unreadCount);
      } catch (e) {}
    };
    fetchProfile();
    const interval = setInterval(fetchProfile, 10000);
    return () => clearInterval(interval);
  }, [user.id]);

  const mainStyle = user?.wallpaper ? {
    backgroundImage: `linear-gradient(rgba(var(--bg-primary-rgb), 0.85), rgba(var(--bg-primary-rgb), 0.95)), url(${user.wallpaper})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  } : {};

  // Check if we are in a sub-view that should hide the navbar (like a full screen chat or game)
  const isFullScreen = location.pathname.includes('/games/') || 
                       (location.pathname.startsWith('/chats/') && location.pathname !== '/chats');

  return (
    <div className="flex justify-center h-screen bg-black overflow-hidden">
      <div className="flex flex-col w-full h-full bg-bg-primary text-text-main overflow-hidden dashboard-container relative" style={mainStyle}>
        <div className="h-1 bg-gradient-to-r from-accent via-indigo-500 to-emerald-500 w-full shrink-0" />

        <div className="flex-1 flex flex-col overflow-hidden relative">
            <Outlet context={{ setPreviewImage, setSelectedProfile, totalUnread }} />
        </div>

        {!isFullScreen && (
          <Navbar activeTab={activeTab} role={user.role} unreadCount={totalUnread} />
        )}

        <AnimatePresence>
          {previewImage && (
            <div 
              className="fixed inset-0 z-[100] bg-bg-primary/90 backdrop-blur-2xl flex items-center justify-center p-4"
              onClick={() => setPreviewImage(null)}
            >
              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={previewImage} 
                className="max-w-full max-h-full rounded-3xl shadow-2xl" 
              />
              <button className="absolute top-8 right-8 text-text-dim hover:text-text-main transition-colors"><X size={32} /></button>
            </div>
          )}
        </AnimatePresence>

        <UserProfileModal 
          userId={selectedProfile} 
          onClose={() => setSelectedProfile(null)} 
          onChat={(id) => { navigate(`/chats/${id}`); setSelectedProfile(null); }}
        />
      </div>
    </div>
  );
};

// --- NAVBAR COMPONENT ---
const Navbar = ({ activeTab, role, unreadCount }: { activeTab: string, role: string, unreadCount?: number }) => {
  const tabs = [
    { id: 'chats', label: 'Чаты', icon: MessageSquare, hasBadge: (unreadCount || 0) > 0 },
    { id: 'reviews', label: 'Отзывы', icon: Star },
    { id: 'channels', label: 'Каналы', icon: Users },
    { id: 'system', label: 'Система', icon: LayoutDashboard, hide: role === 'USER' },
    { id: 'settings', label: 'Профиль', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-primary/90 backdrop-blur-xl border-t border-slate-800/50 px-6 py-4 z-40">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {tabs.filter(t => !t.hide).map(tab => (
          <Link 
            key={tab.id} 
            to={`/${tab.id}`} 
            className="flex flex-col items-center p-1 group relative outline-none"
          >
             <div className={cn("p-3 rounded-2xl transition-all duration-300", activeTab === tab.id ? "bg-accent text-white shadow-lg shadow-accent/30 -translate-y-2" : "text-text-dim hover:text-text-main hover:bg-white/5")}>
              <tab.icon size={24} />
              {tab.hasBadge && (activeTab !== tab.id) && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-rose-500 rounded-full border-2 border-bg-primary" />
              )}
            </div>
            <span className={cn("text-[8px] font-black uppercase mt-1 tracking-widest transition-opacity duration-300", activeTab === tab.id ? "opacity-100" : "opacity-0")}>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
