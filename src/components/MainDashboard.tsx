
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Users, Settings, LayoutDashboard, Search, 
  Menu, X, Bell, LogOut, Shield, Heart, Plus, Mic, Star, 
  CheckCheck, ChevronRight, Camera, FileText, Ban, AlertTriangle, 
  BarChart3, Hammer, ShieldAlert, Palette, HelpCircle, User as UserIcon
} from 'lucide-react';
import { apiFetch } from '../lib/api';

// --- TYPES ---
type Role = 'USER' | 'ADMIN' | 'CURATOR' | 'OWNER';
interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  role: Role;
}

// --- HELPERS ---
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const MainDashboard = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Components like ChatList, ChatView, etc. will be rendered here.
  // I will move them from the old App.tsx to this file for now to keep it working, 
  // but they are now powered by the real API helpers.

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden">
      {/* Top Banner (Optional/Theme) */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 w-full" />

      {/* Main Content Area */}
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
             <ChatList 
               role={user.role} 
               onSelectChat={(id) => setSelectedChat(id)} 
             />
          )}
          {activeTab === 'system' && (user.role !== 'USER') && (
            <SystemDashboard role={user.role} user={user} />
          )}
          {activeTab === 'settings' && (
            <SettingsView user={user} onLogout={onLogout} />
          )}
          {activeTab === 'channels' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#0f172a]">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 text-blue-500"
              >
                <Users size={48} />
              </motion.div>
              <h2 className="text-2xl font-black text-white italic tracking-tighter">Каналы & Ресурсы</h2>
              <p className="text-slate-500 text-sm mt-3 font-medium max-w-xs leading-relaxed italic">
                Библиотека полезных практик и новостей нашего комьюнити готовится к запуску.
              </p>
              <button className="mt-8 bg-slate-800 hover:bg-slate-700 text-slate-400 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-slate-700">Оповестить меня</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {!selectedChat && <Navbar activeTab={activeTab} onTabChange={setActiveTab} role={user.role} />}

      {/* Overlays */}
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

// --- CHAT COMPONENTS ---
const ChatList = ({ role, onSelectChat }: { role: Role, onSelectChat: (id: string) => void }) => {
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
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Всего диалогов: {chats.length}</p>
        </div>
        <button 
          onClick={handleNewChat}
          className="bg-blue-600/10 text-blue-400 p-3 rounded-2xl hover:bg-blue-600/20 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {showAdmins && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md p-6 flex items-center justify-center" onClick={() => setShowAdmins(false)}>
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl w-full max-w-sm space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-black text-xl italic">Выбор специалиста</h3>
              <button onClick={() => setShowAdmins(false)} className="text-slate-500 hover:text-white"><Plus size={24} className="rotate-45" /></button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {admins.length === 0 ? (
                <p className="text-slate-600 text-sm font-bold text-center py-8 italic tracking-tighter">Специалисты будут доступны в ближайшее время...</p>
              ) : admins.map(admin => (
                <button 
                  key={admin.id}
                  onClick={() => { onSelectChat(admin.id); setShowAdmins(false); }}
                  className="w-full flex items-center p-4 bg-slate-800/40 rounded-[2rem] hover:bg-slate-800 border border-transparent hover:border-blue-500/30 transition-all text-left"
                >
                  <img src={admin.avatar || `https://i.pravatar.cc/150?u=${admin.id}`} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                  <div className="ml-4">
                    <p className="text-white font-black italic">{admin.nickname}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{admin.stats?.dialogsCount || 0} диалогов</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-3 mt-4">
        {chats.length === 0 ? (
          <p className="text-center text-slate-600 text-xs font-bold py-12">У вас пока нет активных диалогов</p>
        ) : chats.map((chat) => (
          <button 
            key={chat.id} 
            onClick={() => onSelectChat(chat.id)}
            className="w-full flex items-center p-4 mb-2 rounded-3xl hover:bg-slate-800/50 transition-all group border border-transparent hover:border-slate-800"
          >
            <div className="relative">
              <img src={chat.avatar} alt={chat.name} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-800 group-hover:ring-blue-500/30 transition-all" />
              {chat.unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-[#0f172a] shadow-lg">
                  {chat.unread}
                </span>
              )}
            </div>
            <div className="ml-4 flex-1 text-left">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{chat.name}</span>
                <span className="text-[10px] font-bold text-slate-500 tracking-tighter uppercase">
                  {new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-1.5 font-medium leading-relaxed">{chat.lastMsg}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const ChatView = ({ chatId, onBack, onImageClick, userRole }: { chatId: string, onBack: () => void, onImageClick: (url: string) => void, userRole: Role }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await apiFetch(`/api/messages/${chatId}`);
        const data = await res.json();
        if (Array.isArray(data)) setMessages(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [chatId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const content = input;
    setInput('');
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: chatId, content }),
      });
      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRate = async (rating: number) => {
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ adminId: chatId, rating }),
      });
      setShowRating(false);
      alert('Спасибо за оценку!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#17212b]">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-md">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={28} className="rotate-180" /></button>
          <div className="relative ml-2">
            <img src={`https://i.pravatar.cc/150?u=${chatId}`} className="w-10 h-10 rounded-xl" alt="partner" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#242f3d]"></div>
          </div>
          <div className="ml-4">
            <h3 className="font-black text-white tracking-tight leading-none text-base">Специалист</h3>
            <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1 inline-block">в сети</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userRole === 'USER' && <button onClick={() => setShowRating(true)} className="p-3 bg-blue-600/10 text-blue-400 rounded-2xl hover:bg-blue-600/20 transition-all"><Star size={20} /></button>}
          <button className="p-3 bg-slate-800/50 text-slate-400 rounded-2xl hover:text-white transition-all"><Bell size={20} /></button>
        </div>
      </header>

      {/* Rating Overlay */}
      {showRating && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-lg flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl w-full max-w-sm text-center space-y-6"
          >
            <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] mx-auto flex items-center justify-center text-amber-500">
               <Star size={40} fill="currentColor" />
            </div>
            <h4 className="text-xl font-black text-white italic tracking-tighter">Оцените работу специалиста</h4>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => handleRate(s)} className="text-amber-400 hover:scale-125 transition-transform"><Star size={32} /></button>
              ))}
            </div>
            <button onClick={() => setShowRating(false)} className="w-full bg-slate-800 text-slate-400 font-black uppercase tracking-[0.3em] py-4 rounded-2xl text-[10px]">Отмена</button>
          </motion.div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#17212b] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        {loading && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest">Загрузка сообщений...</div>
        ) : messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            key={msg.id}
            className={cn(
              "max-w-[85%] p-3.5 rounded-3xl shadow-xl relative transition-all group",
              msg.senderId !== chatId 
                ? "bg-[#2b5278] text-white ml-auto rounded-tr-none" 
                : "bg-[#242f3d] text-slate-100 mr-auto rounded-tl-none"
            )}
          >
            {msg.mediaType === 'voice' ? (
              <div className="flex items-center gap-3 pr-2 py-1">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Mic size={18} className="text-white" />
                </div>
                <div className="flex gap-1 h-6 items-center">
                  {[20, 50, 80, 40, 60, 90, 30, 70, 50, 40].map((h, i) => (
                    <div key={i} className={cn("w-1 rounded-full", i < 5 ? "bg-blue-400" : "bg-slate-600")} style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
            ) : msg.mediaType === 'photo' ? (
              <div className="space-y-2">
                <img 
                  src={msg.mediaUrl} 
                  className="rounded-2xl w-full cursor-zoom-in hover:opacity-90 transition-opacity shadow-lg" 
                  alt="shared photo" 
                  onClick={() => onImageClick(msg.mediaUrl)}
                />
                {msg.content && <p className="text-sm leading-relaxed font-medium">{msg.content}</p>}
              </div>
            ) : (
              <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
            )}
            <div className="flex items-center justify-end gap-1.5 mt-1 opacity-60">
              <span className="text-[9px] font-bold uppercase tracking-tighter">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {msg.senderId !== chatId && <CheckCheck size={14} className={msg.read ? "text-blue-400" : "text-slate-400"} />}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-[#0f172a] flex items-center gap-3">
        <button className="text-slate-500 hover:text-blue-400 p-2 transition-colors"><Camera size={26} /></button>
        <div className="flex-1 bg-slate-800/50 rounded-3xl flex items-center px-4 py-1 border border-slate-800 focus-within:border-blue-500/30 transition-all">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ваш ответ..." 
            className="flex-1 bg-transparent py-3 text-sm focus:outline-none" 
          />
          <button className="ml-2 text-slate-500 hover:text-blue-400 transition-colors"><Mic size={22} /></button>
        </div>
        <button 
          onClick={handleSend}
          className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
        >
          <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
};

const SystemDashboard = ({ role, user }: { role: Role, user: User }) => {
  const [view, setView] = useState<'stats' | 'staff' | 'rules' | 'moderation'>('stats');
  const [systemStats, setSystemStats] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, staffRes] = await Promise.all([
          apiFetch('/api/stats/system'),
          apiFetch('/api/staff')
        ]);
        const statsData = await statsRes.json();
        const staffData = await staffRes.json();
        setSystemStats(statsData);
        setStaff(staffData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Загрузка панели управления...</div>;

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-[#0f172a]">
      <div className="p-6">
        <header className="flex items-center justify-between mb-8">
           <div>
             <h2 className="text-3xl font-black text-white italic tracking-tighter">Панель Управления</h2>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Системный уровень: {role}</p>
           </div>
           <div className="w-12 h-12 bg-rose-600/10 rounded-2xl flex items-center justify-center text-rose-500">
             <Shield size={24} />
           </div>
        </header>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'stats', label: 'Аналитика', icon: BarChart3 },
            { id: 'staff', label: 'Персонал', icon: Users },
            { id: 'rules', label: 'Устав', icon: FileText },
            { id: 'moderation', label: 'Модерация', icon: ShieldAlert },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all",
                view === tab.id ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "bg-slate-800 text-slate-500"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {view === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-3xl" />
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest leading-none mb-1">Всего сообщений</p>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors">{systemStats?.totalMessages || 0}</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 blur-3xl" />
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest leading-none mb-1">Пользователей</p>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-black text-white group-hover:text-rose-400 transition-colors">{systemStats?.totalUsers || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
              <h3 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                <BarChart3 size={16} className="text-blue-500" />
                <span>Активность системы</span>
              </h3>
              <div className="h-44 w-full bg-slate-800/10 rounded-[2rem] flex items-end justify-between p-6 space-x-2 border border-slate-800/30">
                {(systemStats?.dailyStats || [40, 60, 45, 80, 55, 90, 70, 50, 65, 85]).map((h: number, i: number) => (
                  <motion.div 
                    key={i} 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="flex-1 bg-gradient-to-t from-blue-600/40 to-blue-500 rounded-lg group relative"
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold">{h}k</div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] space-y-4 shadow-xl">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] px-2 italic">Команда</h3>
              {staff.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-800/20 rounded-2xl border border-slate-800/30 hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-slate-400">{item.nickname[0]}</div>
                    <div>
                      <p className="text-sm font-black text-slate-100 italic tracking-tight">{item.nickname}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{item.stats?.messagesSent || 0} сообщений</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-blue-400">{(item.stats?.averageRating || 0).toFixed(1)}</span>
                    <Star size={12} fill="currentColor" className="text-blue-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'staff' && (
          <div className="space-y-4">
            <header className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Активные сотрудники</h3>
              {role === 'OWNER' && <button className="text-[10px] font-black text-blue-400 uppercase border border-blue-400/30 px-3 py-1 rounded-full">+ Нанять</button>}
            </header>
            <div className="space-y-2">
              {staff.map((s, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-xl hover:border-slate-600 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black bg-blue-600">{s.nickname[0]}</div>
                      <div>
                        <p className="font-black text-lg text-white tracking-tight leading-none">{s.nickname}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{s.role}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400">
                      Online
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800/30">
                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Продуктивность</p>
                       <p className="text-lg font-black text-white italic mt-1">{s.stats?.completionRate || 0}%</p>
                    </div>
                    <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800/30">
                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Куратор</p>
                       <p className="text-sm font-black text-slate-400 italic mt-2">{s.managedBy?.nickname || 'Owner'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'rules' && (
           <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
             <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mb-2">
               <FileText size={32} />
             </div>
             <h3 className="text-2xl font-black text-white italic tracking-tighter">Устав и Правила</h3>
             <div className="space-y-4">
               {[
                 "Эмпатия — наш главный приоритет.",
                 "Никакой деанонимизации пользователей.",
                 "Стриктный запрет на личные советы вне контекста.",
                 "Время ответа в чате не должно превышать 3 минут."
               ].map((rule, i) => (
                 <div key={i} className="flex gap-4 items-start">
                   <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-500 flex-shrink-0 flex items-center justify-center text-[10px] font-black font-mono">{i+1}</div>
                   <p className="text-sm text-slate-300 font-medium leading-relaxed italic">{rule}</p>
                 </div>
               ))}
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

const SettingsView = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-[#0f172a]">
      <div className="p-8">
        <header className="mb-10 text-center">
           <div className="relative inline-block group">
             <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
             <img src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} className="relative w-32 h-32 rounded-[3.5rem] border-4 border-slate-900 shadow-2xl object-cover" alt="me" />
             <button className="absolute bottom-1 right-1 bg-blue-600 p-3 rounded-2xl text-white shadow-xl hover:scale-110 transition-transform"><Camera size={20} /></button>
           </div>
           <h2 className="text-3xl font-black text-white italic tracking-tighter mt-6">{user.nickname}</h2>
           <p className="text-blue-500 text-xs font-black uppercase tracking-[0.3em] mt-1">{user.role}</p>
        </header>

        <div className="space-y-3">
          {[
            { label: 'Редактировать профиль', icon: UserIcon, color: 'text-blue-400' },
            { label: 'Безопасность и пароль', icon: Shield, color: 'text-emerald-400' },
            { label: 'Настройки уведомлений', icon: Bell, color: 'text-amber-400' },
            { label: 'Оформление (Темы)', icon: Palette, color: 'text-purple-400' },
            { label: 'Помощь и FAQ', icon: HelpCircle, color: 'text-slate-400' },
          ].map((item, i) => (
            <button key={i} className="w-full bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between group hover:border-slate-700 transition-all">
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-xl bg-slate-800", item.color)}>
                  <item.icon size={20} />
                </div>
                <span className="text-sm font-black text-slate-100 italic tracking-tight">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>

        <button 
          onClick={onLogout}
          className="w-full mt-8 bg-rose-500/10 border border-rose-500/20 text-rose-500 p-5 rounded-[2rem] flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-rose-500/5"
        >
          <LogOut size={20} />
          Выйти из аккаунта
        </button>

        <p className="text-center text-slate-600 text-[9px] font-black uppercase tracking-[0.4em] mt-12 italic">SoulLink v2.0.4 - Heavy Mental</p>
      </div>
    </div>
  );
};

const Navbar = ({ activeTab, onTabChange, role }: { activeTab: string, onTabChange: (t: string) => void, role: Role }) => {
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
          <button 
            key={tab.id} 
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center group relative p-1"
          >
            <div className={cn(
               "p-3 rounded-2xl transition-all duration-300",
               activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 -translate-y-2" : "text-slate-500 hover:text-slate-300"
            )}>
              <tab.icon size={24} />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase mt-1 tracking-widest transition-all",
              activeTab === tab.id ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
