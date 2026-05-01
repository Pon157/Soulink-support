
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Users, Settings, LayoutDashboard, Search, 
  Menu, X, Bell, LogOut, Shield, Heart, Plus, Mic, Star, 
  CheckCheck, ChevronRight, Camera, FileText, Ban, AlertTriangle, 
  BarChart3, Hammer, ShieldAlert, Palette, HelpCircle, User as UserIcon
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { SettingsView } from './dashboard/SettingsView';
import { ChatView } from './dashboard/ChatView';
import { SystemDashboard } from './dashboard/SystemDashboard';

// --- TYPES ---
type Role = 'USER' | 'ADMIN' | 'CURATOR' | 'OWNER';
interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  role: Role;
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const MainDashboard = ({ user: initialUser, onLogout }: { user: any, onLogout: () => void }) => {
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.theme) {
      document.documentElement.setAttribute('data-theme', user.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [user?.theme]);

  const mainStyle = user?.banner ? {
    backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url(${user.banner})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-main overflow-hidden" style={mainStyle}>
      <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 w-full" />

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3, ease: 'circOut' }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {activeTab === 'chats' && (
             <ChatList onSelectChat={(id) => setSelectedChat(id)} />
          )}
          {activeTab === 'system' && (user.role !== 'USER') && (
            <SystemDashboard role={user.role} />
          )}
          {activeTab === 'settings' && (
            <SettingsView user={user} setUser={setUser} onLogout={onLogout} />
          )}
          {activeTab === 'channels' && (
            <div className="flex-1 overflow-y-auto p-6 bg-bg-primary">
              <div className="bg-bg-secondary border border-slate-800 p-8 rounded-[3rem] text-center space-y-4 mb-8">
                <Users size={48} className="mx-auto text-accent" />
                <h2 className="text-2xl font-black italic tracking-tighter">Авторские каналы</h2>
                <p className="text-text-dim text-xs italic px-6">Подписывайтесь на блоги наших администраторов, чтобы быть в курсе обновлений и эксклюзивного контента.</p>
              </div>
              
              {/* Demo channels */}
              {['Nexus Daily', 'Soul Support', 'Private Lounge'].map((name, i) => (
                <div key={i} className="bg-bg-secondary p-5 rounded-[2rem] border border-slate-800 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/20 rounded-2xl" />
                    <div>
                      <p className="font-black italic tracking-tight">{name}</p>
                      <p className="text-[9px] text-text-dim uppercase font-bold tracking-widest">124 Поста • 8.2k Подп.</p>
                    </div>
                  </div>
                  <button className="bg-accent px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Читать</button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {!selectedChat && <Navbar activeTab={activeTab} onTabChange={setActiveTab} role={user.role} />}

      <AnimatePresence>
        {selectedChat && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#17212b]"
          >
            <ChatView 
              chatId={selectedChat} 
              onBack={() => setSelectedChat(null)} 
              onImageClick={(url) => setPreviewImage(url)} 
              userRole={user.role}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <motion.img 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={previewImage} 
            className="max-w-full max-h-full rounded-3xl shadow-2xl" 
          />
          <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"><X size={32} /></button>
        </div>
      )}
    </div>
  );
};

// --- CHATLIST COMPONENT ---
const ChatList = ({ onSelectChat }: { onSelectChat: (id: string) => void }) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmins, setShowAdmins] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await apiFetch('/api/chats');
        const data = await res.json();
        if (Array.isArray(data)) setChats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
    const interval = setInterval(fetchChats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleNewChat = async () => {
    setShowAdmins(true);
    try {
      const res = await apiFetch('/api/admins');
      const data = await res.json();
      setAdmins(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && chats.length === 0) return <div className="p-12 text-center text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Загрузка диалогов...</div>;

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-[#0f172a]">
      <div className="p-6 flex items-center justify-between sticky top-0 bg-[#0f172a]/80 backdrop-blur-md z-10">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Чаты</h2>
        </div>
        <button onClick={handleNewChat} className="bg-blue-600/10 text-blue-400 p-3 rounded-2xl"><Plus size={24} /></button>
      </div>

      {showAdmins && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md p-6 flex items-center justify-center" onClick={() => setShowAdmins(false)}>
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-xl italic text-center mb-4">Начать новый диалог</h3>
            {admins.map(admin => (
              <button key={admin.id} onClick={() => { onSelectChat(admin.id); setShowAdmins(false); }} className="w-full flex items-center p-4 bg-slate-800 rounded-2xl">
                <img src={admin.avatar || `https://i.pravatar.cc/150?u=${admin.id}`} className="w-10 h-10 rounded-xl object-cover" />
                <span className="ml-3 text-white font-bold">{admin.nickname}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-3">
        {chats.map((chat) => (
          <button key={chat.id} onClick={() => onSelectChat(chat.id)} className="w-full flex items-center p-4 mb-2 rounded-3xl hover:bg-slate-800/50 transition-all">
            <img src={chat.avatar} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-800" />
            <div className="ml-4 flex-1 text-left">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-100">{chat.name}</span>
                <span className="text-[10px] text-slate-500 uppercase">{new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-1">{chat.lastMsg}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- NAVBAR COMPONENT ---
const Navbar = ({ activeTab, onTabChange, role }: { activeTab: string, onTabChange: (t: string) => void, role: string }) => {
  const tabs = [
    { id: 'chats', label: 'Чаты', icon: MessageSquare },
    { id: 'channels', label: 'Каналы', icon: Users },
    { id: 'system', label: 'Система', icon: LayoutDashboard, hide: role === 'USER' },
    { id: 'settings', label: 'Профиль', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/90 backdrop-blur-xl border-t border-slate-800/50 px-6 py-4 z-40">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {tabs.filter(t => !t.hide).map(tab => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)} className="flex flex-col items-center p-1 group">
             <div className={cn("p-3 rounded-2xl transition-all duration-300", activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 -translate-y-2" : "text-slate-500 hover:text-slate-300")}>
              <tab.icon size={24} />
            </div>
            <span className={cn("text-[8px] font-black uppercase mt-1 tracking-widest", activeTab === tab.id ? "opacity-100" : "opacity-0")}>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
