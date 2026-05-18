import React, { useState, useEffect } from 'react';
import { Plus, Shield, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { UserAvatar } from '../ui/UserAvatar';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const ChatList = ({ onSelectChat, user }: { onSelectChat: (id: string) => void, user: any }) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmins, setShowAdmins] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);

  const fetchChats = async () => {
    try {
      const res = await apiFetch('/api/chats');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setChats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
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

  if (loading && chats.length === 0) return <div className="p-12 text-center text-text-dim font-black uppercase text-[10px] tracking-widest animate-pulse">Загрузка диалогов...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary">
      <div className="p-6 flex items-center justify-between sticky top-0 bg-bg-primary/80 backdrop-blur-md z-10">
        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight italic">Чаты</h2>
        </div>
        <button onClick={handleNewChat} className="bg-accent/10 text-accent p-3 rounded-2xl"><Plus size={24} /></button>
      </div>

      {showAdmins && (
        <div className="fixed inset-0 z-[60] bg-bg-primary/80 backdrop-blur-md p-6 flex items-center justify-center" onClick={() => setShowAdmins(false)}>
          <div className="bg-bg-secondary border border-slate-800 p-8 rounded-[3rem] shadow-2xl w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-text-main font-black text-xl italic text-center mb-4">Начать новый диалог</h3>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {admins.map(admin => (
                <button key={admin.id} onClick={() => { onSelectChat(admin.id); setShowAdmins(false); }} className="w-full flex items-center p-4 bg-bg-primary rounded-2xl hover:border-accent border border-transparent transition-all">
                  <UserAvatar user={admin} size={40} className="shadow-sm" />
                  <div className="ml-3 text-left">
                    <p className="text-text-main font-bold leading-none">{admin.nickname}</p>
                    <p className="text-[9px] text-text-dim uppercase font-black tracking-widest mt-1">Рейтинг: {admin.averageRating?.toFixed(1) || '0.0'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 mb-4">
        {(() => {
          const systemChat = chats.find(c => c.id === 'SYSTEM');
          return (
            <button 
              onClick={() => onSelectChat('SYSTEM')} 
              className="w-full flex items-center p-5 rounded-[2.5rem] bg-accent/5 border border-accent/10 hover:border-accent/30 transition-all group"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
                  <Shield size={24} />
                </div>
                {systemChat && systemChat.unread > 0 ? (
                  <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-rose-500 rounded-full border-2 border-bg-primary flex items-center justify-center text-[10px] text-white font-black px-1 shadow-lg shadow-rose-500/20">
                    {systemChat.unread}
                  </div>
                ) : (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-bg-primary shadow-lg" />
                )}
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-black text-text-main italic tracking-tight text-sm">Техподдержка Команды</h3>
                <p className="text-[9px] text-accent font-black uppercase tracking-widest mt-0.5">Административный сектор</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })()}
      </div>

      <div className="px-3">
        {chats.filter(c => c.id !== 'SYSTEM').map((chat) => (
          <button key={chat.id} onClick={() => onSelectChat(chat.id)} className="w-full flex items-center p-4 mb-2 rounded-[2.5rem] bg-bg-secondary/40 border border-slate-800/10 hover:border-accent/30 transition-all">
            <div className="relative">
              <UserAvatar user={chat} size={56} className="ring-2 ring-slate-800/50" />
              {chat.unread > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-bg-primary flex items-center justify-center text-[10px] text-white font-black">{chat.unread}</div>
              )}
              {chat.isOnRest && (
                <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded border border-bg-primary">Rest</div>
              )}
            </div>
            <div className="ml-4 flex-1 text-left">
              <div className="flex justify-between items-center">
                <span className={cn("font-bold italic tracking-tight", chat.unread > 0 ? "text-text-main" : "text-text-dim")}>{chat.name}</span>
                <span className="text-[9px] text-text-dim uppercase font-black tracking-widest">{new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className={cn("text-xs truncate mt-1 italic", chat.unread > 0 ? "text-text-main font-bold" : "text-text-dim")}>{chat.lastMsg || 'Нет сообщений'}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
