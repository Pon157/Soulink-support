import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  Settings, 
  Users, 
  Shield, 
  BarChart3, 
  User as UserIcon,
  LogOut,
  Send,
  Plus,
  ArrowLeft,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Check,
  CheckCheck,
  Star,
  Bell,
  Palette
} from 'lucide-react';
import { User, AuthState, Role, Message } from './types';
import { THEMES, ThemeKey } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- COMPONENTS ---

const Register = ({ onAuth }: { onAuth: (user: User, token: string) => void }) => {
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!agreed) return alert('Please agree to personal data processing');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, nickname }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('verify');
        if (data.debugCode) alert(`Debug: Your code is ${data.debugCode}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, username, nickname }),
      });
      const data = await res.json();
      if (data.user) onAuth(data.user, data.token);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-screen p-6 max-w-md mx-auto w-full transition-colors duration-500",
      "bg-[#0f172a] text-slate-200"
    )}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full space-y-8"
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center text-white mb-6 shadow-2xl shadow-blue-500/20">
            <MessageCircle size={40} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">SoulLink</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium uppercase tracking-widest">Support System</p>
        </div>

        {step === 'email' ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Account Identity</p>
              <input 
                type="email" 
                placeholder="Электронная почта" 
                className="w-full bg-slate-900/50 border border-slate-800 p-4 rounded-2xl text-sm focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full bg-slate-900/50 border border-slate-800 p-4 rounded-2xl text-sm focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Псевдоним" 
              className="w-full bg-slate-900/50 border border-slate-800 p-4 rounded-2xl text-sm focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-600"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            
            <div className="flex items-start gap-3 p-2">
              <input 
                type="checkbox" 
                id="terms" 
                className="mt-1 w-4 h-4 rounded border-slate-800 bg-slate-900 text-blue-500 focus:ring-offset-slate-900"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed">
                Я согласен на обработку <button onClick={() => setShowTerms(true)} className="text-blue-400 underline decoration-blue-400/30 hover:text-blue-300 transition-colors">персональных данных</button>
              </label>
            </div>

            <button 
              onClick={handleSendCode}
              disabled={loading || !agreed}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-sm tracking-wide shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
            >
              {loading ? 'Отправка...' : 'Зарегистрироваться'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-400">Код подтверждения отправлен на</p>
              <p className="font-mono text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full inline-block text-xs">{email}</p>
            </div>
            <input 
              type="text" 
              placeholder="000000" 
              className="w-full bg-slate-900/50 border border-slate-800 p-5 rounded-2xl text-center text-3xl font-mono tracking-[0.4em] focus:border-blue-500/50 outline-none transition-all"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value)}
            />
            <button 
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              Подтвердить
            </button>
            <button 
              onClick={() => setStep('email')} 
              className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-400 transition-colors"
            >
              Вернуться назад
            </button>
          </div>
        )}
      </motion.div>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: 20, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl"
            >
              <h3 className="text-xl font-black mb-6 text-white tracking-tight">Персональные данные</h3>
              <div className="max-h-64 overflow-y-auto pr-2 text-xs text-slate-400 space-y-4 mb-8 custom-scrollbar">
                <p className="font-bold text-slate-300">Политика конфиденциальности SoulLink</p>
                <p>Мы серьезно относимся к вашей конфиденциальности. Используя SoulLink, вы соглашаетесь на сбор и использование информации в соответствии с этой политикой.</p>
                <p>1. Данные: Email, псевдоним, история сообщений.</p>
                <p>2. Цель: Оказание психологической поддержки и модерация системы.</p>
                <p>3. Безопасность: Мы используем шифрование и защищенные S3-хранилища для ваших файлов.</p>
                <p>4. Доступ: К вашим диалогам имеют доступ только закрепленный администратор и курирующий его специалист.</p>
              </div>
              <button 
                onClick={() => setShowTerms(false)}
                className="w-full bg-slate-800 border border-slate-700 py-4 rounded-2xl font-bold text-white hover:bg-slate-700 transition-colors"
              >
                Понятно
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- NAVIGATION ---
const Navbar = ({ activeTab, onTabChange, role }: { activeTab: string, onTabChange: (tab: string) => void, role: Role }) => {
  const tabs = [
    { id: 'chats', icon: MessageCircle, label: 'Chats' },
    { id: 'channels', icon: Users, label: 'Channels' },
    ...(role === 'ADMIN' || role === 'CURATOR' || role === 'OWNER' ? [{ id: 'dashboard', icon: BarChart3, label: 'Stats' }] : []),
    ...(role === 'OWNER' ? [{ id: 'admin', icon: Shield, label: 'System' }] : []),
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/80 backdrop-blur-xl border-t border-slate-800/50 px-8 py-3 flex justify-between items-center z-40 max-w-md mx-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex flex-col items-center space-y-1.5 transition-all relative",
            activeTab === tab.id ? "text-blue-400" : "text-slate-500"
          )}
          id={`nav-tab-${tab.id}`}
        >
          {activeTab === tab.id && (
            <motion.div layoutId="nav-active" className="absolute -top-3 w-8 h-1 bg-blue-500 rounded-full" />
          )}
          <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-[0.1em]">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

// --- CHAT COMPONENTS ---
const ChatList = ({ role, onSelectChat }: { role: Role, onSelectChat: (id: string) => void }) => {
  // Mock data for demo
  const chats = [
    { id: '1', name: 'Dr. Anna Smith', lastMsg: 'Как вы себя чувствуете сегодня?', time: '12:45', unread: 2, avatar: 'https://i.pravatar.cc/150?u=anna' },
    { id: '2', name: 'Канал Поддержки', lastMsg: 'Новый пост: 5 техник дыхания', time: 'Yesterday', unread: 0, avatar: 'https://i.pravatar.cc/150?u=support' },
    { id: '3', name: 'Системный Админ', lastMsg: 'Ваш запрос обработан.', time: 'Monday', unread: 0, avatar: 'https://i.pravatar.cc/150?u=admin' },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-[#0f172a]">
      <div className="p-6 flex items-center justify-between sticky top-0 bg-[#0f172a]/90 backdrop-blur-md z-10 border-b border-slate-800/30">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Чаты</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Всего диалогов: 42</p>
        </div>
        <button className="bg-blue-600/10 text-blue-400 p-3 rounded-2xl hover:bg-blue-600/20 transition-all"><Plus size={24} /></button>
      </div>
      <div className="px-3 mt-4">
        {chats.map((chat) => (
          <button 
            key={chat.id} 
            onClick={() => onSelectChat(chat.id)}
            className="w-full flex items-center p-4 hover:bg-slate-800/40 rounded-[2rem] transition-all mb-1 group"
          >
            <div className="relative">
              <img src={chat.avatar} alt={chat.name} className="w-16 h-16 rounded-[1.5rem] object-cover ring-2 ring-slate-800 group-hover:ring-blue-500/50 transition-all shadow-xl" />
              {chat.unread > 0 && (
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-[#0f172a] shadow-lg">
                  {chat.unread}
                </div>
              )}
            </div>
            <div className="ml-4 flex-1 text-left">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{chat.name}</span>
                <span className="text-[10px] font-bold text-slate-500 tracking-tighter uppercase">{chat.time}</span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-1.5 font-medium leading-relaxed">{chat.lastMsg}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const ChatView = ({ chatId, onBack }: { chatId: string, onBack: () => void }) => {
  const [messages, setMessages] = useState<any[]>([
    { id: '0', content: 'Привет! Как я могу тебе сегодня помочь? Мы здесь, чтобы выслушать. 🌿', senderId: 'other', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: 'v1', type: 'voice', senderId: 'other', duration: '0:12', createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString() },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now().toString(), content: input, senderId: 'me', createdAt: new Date().toISOString() };
    setMessages([...messages, newMsg]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#17212b] flex flex-col max-w-md mx-auto overflow-hidden">
      {/* Chat Header */}
      <div className="bg-[#242f3d] px-5 py-4 flex items-center border-b border-black/10 shadow-lg z-10">
        <button onClick={onBack} className="text-slate-400 hover:text-white mr-4 transition-colors"><ArrowLeft size={24} /></button>
        <div className="flex-1 flex items-center">
          <div className="relative">
            <img src={`https://i.pravatar.cc/150?u=${chatId}`} className="w-11 h-11 rounded-2xl shadow-xl border border-slate-700/50" alt="avatar" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#242f3d]"></div>
          </div>
          <div className="ml-4">
            <h3 className="font-black text-white tracking-tight leading-none text-base">Admin Alice</h3>
            <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1 inline-block">в сети</span>
          </div>
        </div>
        <div className="flex gap-4 text-slate-400">
          <button className="hover:text-white transition-colors"><ImageIcon size={20} /></button>
          <button className="hover:text-white transition-colors"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#17212b] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            key={msg.id} 
            className={cn(
              "max-w-[85%] p-3.5 rounded-3xl shadow-xl relative transition-all group",
              msg.senderId === 'me' 
                ? "bg-[#2b5278] text-white ml-auto rounded-tr-none" 
                : "bg-[#242f3d] text-slate-100 mr-auto rounded-tl-none"
            )}
          >
            {msg.type === 'voice' ? (
              <div className="flex items-center gap-3 pr-2 py-1">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Mic size={18} className="text-white" />
                </div>
                <div className="flex items-end gap-1 h-6 px-1">
                  {[30, 60, 40, 80, 50, 90, 40, 60].map((h, i) => (
                    <div key={i} className={cn("w-1 rounded-full", i < 5 ? "bg-blue-400" : "bg-slate-600")} style={{ height: `${h}%` }}></div>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-bold">{msg.duration}</span>
              </div>
            ) : (
              <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
            )}
            
            <div className="flex items-center justify-end space-x-1 mt-1 opacity-60">
              <span className="text-[9px] font-bold uppercase tracking-tighter">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {msg.senderId === 'me' && <CheckCheck size={14} className="text-blue-400" />}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-[#17212b] p-4 flex items-center gap-3 border-t border-slate-800/50">
        <button className="text-slate-500 hover:text-blue-400 transition-colors"><Plus size={24} strokeWidth={2.5} /></button>
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Сообщение..." 
            className="w-full bg-[#242f3d] border border-slate-800/30 px-5 py-3 rounded-full outline-none text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 transition-all shadow-inner"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-2xl",
            input.trim() ? "bg-blue-600 text-white shadow-blue-500/20" : "bg-slate-800 text-slate-500"
          )}
        >
          {input.trim() ? <Send size={22} fill="currentColor" /> : <Mic size={22} />}
        </motion.button>
      </div>
    </div>
  );
};

// --- SETTINGS ---
const SettingsView = ({ user, theme, onLogout, onThemeChange }: { user: User, theme: ThemeKey, onLogout: () => void, onThemeChange: (key: ThemeKey) => void }) => {
  return (
    <div className="flex-1 overflow-y-auto pb-24 p-6 space-y-8 bg-[#0f172a]">
      <div className="text-center bg-slate-900/50 border border-slate-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative inline-block group">
          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity" />
          <img src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} alt="avatar" className="w-28 h-28 rounded-[2rem] object-cover mb-4 border-4 border-slate-800 relative z-10 transition-transform group-hover:scale-105" />
          <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-slate-900 z-20"></div>
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight leading-none">{user.nickname}</h2>
        <p className="text-blue-400 font-mono text-[10px] uppercase tracking-[0.3em] mt-2 mb-4">@{user.username}</p>
        <div className={cn(
          "inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]",
          user.role === 'OWNER' ? "bg-red-500/20 text-red-400" : 
          user.role === 'ADMIN' ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
        )}>
          {user.role}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Система и Уведомления</h3>
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-800/50 hover:bg-slate-800/10 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600/10 p-3 rounded-2xl text-blue-400 shadow-xl"><Bell size={22} /></div>
              <span className="font-bold text-slate-200">Push-уведомления</span>
            </div>
            <div className="w-12 h-6 bg-blue-600 rounded-full p-1 flex justify-end items-center shadow-lg"><div className="w-4 h-4 bg-white rounded-full"></div></div>
          </div>
          <div onClick={onLogout} className="flex items-center justify-between p-5 hover:bg-red-500/5 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4 text-red-400">
              <div className="bg-red-500/10 p-3 rounded-2xl text-red-500 shadow-xl"><LogOut size={22} /></div>
              <span className="font-bold">Выйти из аккаунта</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Визуальный интерфейс</h3>
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 grid grid-cols-2 gap-4">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => onThemeChange(key)}
              className={cn(
                "flex flex-col items-center p-5 rounded-[2rem] border-2 transition-all group",
                theme === key 
                  ? "border-blue-500 bg-blue-500/5 shadow-2xl shadow-blue-500/10" 
                  : "border-slate-800 hover:border-slate-700 bg-slate-900/30"
              )}
            >
              <div className={cn(
                "p-3 rounded-2xl mb-2 transition-all",
                theme === key ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-500 group-hover:text-slate-300"
              )}>
                <Palette size={24} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest text-center",
                theme === key ? "text-blue-400" : "text-slate-500"
              )}>{THEMES[key].name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- SYSTEM DASHBOARD (OWNER/ADMIN) ---
const SystemDashboard = ({ role }: { role: Role }) => {
  return (
    <div className="flex-1 overflow-y-auto pb-24 p-6 space-y-6 bg-[#0f172a]">
      <header>
        <h2 className="text-3xl font-black text-white tracking-tighter">Аналитика</h2>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Live: Состояние системы</p>
      </header>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-3xl pointer-events-none" />
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Активные чаты</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors">42</span>
            <span className="text-emerald-500 text-[10px] font-black font-mono">+12%</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 blur-3xl pointer-events-none" />
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Тикеты</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-black text-white group-hover:text-rose-400 transition-colors">128</span>
            <span className="text-rose-500 text-[10px] font-black font-mono">-5%</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
        <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><BarChart3 size={18} /></div>
          <span>Активность пользователей</span>
        </h3>
        <div className="h-44 w-full bg-slate-800/10 rounded-[2rem] flex items-end justify-between p-6 space-x-2 border border-slate-800/30">
          {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
             <motion.div 
               key={i} 
               initial={{ height: 0 }}
               animate={{ height: `${h}%` }}
               transition={{ delay: i * 0.1, type: 'spring' }}
               className={cn(
                 "w-full rounded-t-xl opacity-80 shadow-lg shadow-blue-500/10",
                 i === 5 ? "bg-blue-400" : "bg-slate-700"
               )} 
             />
          ))}
        </div>
        <div className="flex justify-between mt-4 px-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
           {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <span key={d}>{d}</span>)}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-6 shadow-xl space-y-4">
        <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] px-2">Логи Модерации</h3>
        <div className="space-y-2">
          {[
            { user: 'dark_user', action: 'BANNED', reason: 'Спам', time: '2м назад', color: 'text-red-400 bg-red-400/10' },
            { user: 'anonymous_9', action: 'WARNED', reason: 'Агрессия', time: '1ч назад', color: 'text-amber-400 bg-amber-400/10' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-800/50 rounded-[1.5rem] hover:bg-slate-800/40 transition-all">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-400">{item.user[0].toUpperCase()}</div>
                 <div>
                   <p className="font-black text-sm text-slate-100 italic tracking-tight">@{item.user}</p>
                   <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mt-1">{item.reason}</p>
                 </div>
               </div>
               <div className="text-right">
                 <span className={cn(
                   "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                   item.color
                 )}>{item.action}</span>
                 <p className="text-[9px] text-slate-600 font-black mt-2 uppercase">{item.time}</p>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, isLoading: true });
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeKey>('HIGH_DENSITY');

  useEffect(() => {
    const saved = localStorage.getItem('soul_auth');
    if (saved) {
      setAuth({ ...JSON.parse(saved), isLoading: false });
    } else {
      setAuth(a => ({ ...a, isLoading: false }));
    }
  }, []);

  const handleAuth = (user: User, token: string) => {
    const state = { user, token, isLoading: false };
    setAuth(state);
    localStorage.setItem('soul_auth', JSON.stringify(state));
  };

  const handleLogout = () => {
    setAuth({ user: null, token: null, isLoading: false });
    localStorage.removeItem('soul_auth');
  };

  if (auth.isLoading) return <div className="h-screen bg-[#0f172a] flex items-center justify-center font-black text-blue-500 animate-pulse tracking-widest uppercase text-xs">SoulLink Initializing...</div>;

  if (!auth.user) return <Register onAuth={handleAuth} />;

  const currentTheme = THEMES[theme];

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-blue-500/30 max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col transition-colors duration-500",
      theme === 'HIGH_DENSITY' ? "bg-[#0f172a]" : "bg-[#f4f4f5]"
    )} style={{ color: currentTheme.text }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'circOut' }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {activeTab === 'chats' && <ChatList role={auth.user.role} onSelectChat={setSelectedChat} />}
          {activeTab === 'dashboard' && <SystemDashboard role={auth.user.role} />}
          {activeTab === 'settings' && <SettingsView user={auth.user} theme={theme} onLogout={handleLogout} onThemeChange={setTheme} />}
          {activeTab === 'channels' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#0f172a]">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-8"
              >
                <div className="w-24 h-24 bg-blue-500/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-blue-500/20 shadow-2xl">
                  <Users size={48} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">Каналы</h3>
                  <p className="text-slate-500 text-sm font-medium mt-3 leading-relaxed">Подпишитесь на каналы кураторов, чтобы получать поддержку и важные обновления в закрепе.</p>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all">Обзор каналов</button>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Navbar activeTab={activeTab} onTabChange={setActiveTab} role={auth.user.role} />

      {/* Overlays */}
      <AnimatePresence>
        {selectedChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50"
          >
            <ChatView chatId={selectedChat} onBack={() => setSelectedChat(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
