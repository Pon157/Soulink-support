import React, { useState, useEffect } from 'react';
import { BarChart3, Users, FileText, ShieldAlert, Star, Plus, ShieldCheck, Mail, Lock, Search, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Modal } from '../ui/Modal';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const SystemDashboard = ({ role, onExpandChat }: { role: string, onExpandChat: (id: string) => void }) => {
  const [view, setView] = useState<'stats' | 'staff' | 'rules' | 'moderation' | 'all_chats' | 'reviews' | 'broadcast' | 'sanctions'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [allChats, setAllChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ nickname: '', username: '', password: '', role: 'ADMIN' });
  const [searchQuery, setSearchQuery] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [broadcastData, setBroadcastData] = useState({ title: '', content: '' });
  const [sanctionData, setSanctionData] = useState({ targetId: '', action: 'ban', reason: '' });

  const fetchData = async () => {
    try {
      const statsRes = await apiFetch('/api/stats/system');
      setStats(await statsRes.json());

      if (role === 'OWNER') {
        const [staffRes, reportsRes, revRes, chatsRes] = await Promise.all([
          apiFetch('/api/staff'),
          apiFetch('/api/moderation/reports'),
          apiFetch('/api/reviews/all'),
          apiFetch('/api/admin/all-chats'),
        ]);
        if (staffRes.ok) setStaff(await staffRes.json());
        if (reportsRes.ok) setReports(await reportsRes.json());
        if (revRes.ok) setReviews(await revRes.json());
        if (chatsRes.ok) setAllChats(await chatsRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Pulse update
    return () => clearInterval(interval);
  }, [role]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/staff/create', { method: 'POST', body: JSON.stringify(newStaff) });
      if (res.ok) {
        setShowAddStaff(false);
        fetchData();
        setNewStaff({ nickname: '', username: '', password: '', role: 'ADMIN' });
      } else {
        const d = await res.json();
        alert(d.error || 'Ошибка');
      }
    } catch (e) { alert('Ошибка сети'); }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/broadcast/send', { method: 'POST', body: JSON.stringify(broadcastData) });
      if (res.ok) {
        alert('Рассылка запущена успешно');
        setBroadcastData({ title: '', content: '' });
      }
    } catch (e) { console.error(e); }
  };

  const handleApplySanction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/sanctions', { method: 'POST', body: JSON.stringify(sanctionData) });
      if (res.ok) {
        alert('Действие применено');
        setSanctionData({ ...sanctionData, targetId: '', reason: '' });
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Инициализация систем...</div>;

  const tabs = [
    { id: 'stats', label: 'Данные', icon: BarChart3, ownerOnly: false },
    { id: 'staff', label: 'Штат', icon: Users, ownerOnly: true },
    { id: 'moderation', label: 'Жалобы', icon: ShieldAlert, ownerOnly: true },
    { id: 'all_chats', label: 'Все чаты', icon: ShieldCheck, ownerOnly: true },
    { id: 'reviews', label: 'Отзывы', icon: Star, ownerOnly: true },
    { id: 'broadcast', label: 'Рассылка', icon: Mail, ownerOnly: true },
    { id: 'sanctions', label: 'Санкции', icon: Lock, ownerOnly: true },
    { id: 'rules', label: 'Устав', icon: FileText, ownerOnly: false },
  ].filter(t => !t.ownerOnly || role === 'OWNER');

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-bg-primary p-6">
      <Modal isOpen={showAddStaff} onClose={() => setShowAddStaff(false)} title="Новый сотрудник">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <input required value={newStaff.nickname} onChange={e => setNewStaff({...newStaff, nickname: e.target.value})} placeholder="Никнейм" className="w-full bg-bg-secondary p-4 rounded-2xl outline-none text-text-main" />
          <input required value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} placeholder="Логин" className="w-full bg-bg-secondary p-4 rounded-2xl outline-none text-text-main" />
          <input type="password" required value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} placeholder="Пароль" className="w-full bg-bg-secondary p-4 rounded-2xl outline-none text-text-main" />
          <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full bg-bg-secondary p-4 rounded-2xl outline-none text-text-main appearance-none">
            <option value="ADMIN">Администратор</option>
            <option value="CURATOR">Куратор</option>
          </select>
          <button type="submit" className="w-full bg-accent py-4 rounded-2xl font-black uppercase text-[10px]">Зачислить</button>
        </form>
      </Modal>

      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-text-main italic tracking-tighter uppercase">Nexus</h1>
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mt-1">Доступ: {role}</p>
        </div>
        {role === 'OWNER' && view === 'staff' && (
          <button onClick={() => setShowAddStaff(true)} className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white"><Plus size={24} /></button>
        )}
      </header>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all whitespace-nowrap",
              view === tab.id ? "bg-accent text-white" : "bg-bg-secondary text-text-dim border border-slate-800/50"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {role === 'OWNER' ? (
              <>
                <StatCard label="Сообщения" value={stats?.totalMessages} />
                <StatCard label="Пользователи" value={stats?.totalUsers} />
                <StatCard label="Баны" value={stats?.bannedUsers} />
              </>
            ) : (
              <>
                <StatCard label="Рейтинг" value={stats?.averageRating?.toFixed(1)} />
                <StatCard label="Сообщения" value={stats?.messagesSent} />
                <StatCard label="Диалоги" value={stats?.dialogsCount} />
              </>
            )}
          </div>
          {role === 'OWNER' && (
            <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-800">
               <h3 className="text-[10px] font-black text-slate-500 uppercase mb-6 tracking-widest px-2">Системная активность (24ч)</h3>
               <div className="h-32 flex items-end gap-1.5 px-2">
                 {(stats?.dailyStats || []).map((v: number, i: number) => (
                   <div key={i} className="flex-1 bg-blue-600/10 rounded-t-lg relative" style={{ height: `${v}%` }}>
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      )}

      {view === 'staff' && (
        <div className="space-y-3">
          {staff.map(s => (
            <div key={s.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={s.avatar || `https://i.pravatar.cc/100?u=${s.id}`} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <p className="font-black text-white italic tracking-tight">{s.nickname}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">@{s.username} • {s.role}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-500 justify-end">
                  <span className="text-[11px] font-black italic">{s.stats?.averageRating?.toFixed(1) || 0}</span>
                  <Star size={10} fill="currentColor" />
                </div>
                <p className="text-[8px] text-slate-600 font-black uppercase mt-0.5">{s.stats?.messagesSent || 0} СOOБЩ.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'all_chats' && (
        <div className="space-y-3">
          <div className="mb-4">
             <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по никнейму..." className="w-full bg-bg-secondary p-4 rounded-2xl outline-none text-text-main border border-slate-800/50 italic text-xs" />
          </div>
          {allChats.filter(c => c.sender.nickname.toLowerCase().includes(searchQuery.toLowerCase()) || c.receiver.nickname.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
            <div key={c.id} onClick={() => onExpandChat(c.senderId)} className="bg-bg-secondary border border-slate-800/50 p-5 rounded-[2rem] flex items-center justify-between cursor-pointer hover:border-accent/30 transition-all">
              <div className="flex items-center gap-4 max-w-[70%]">
                <div className="flex -space-x-3">
                  <img src={c.sender.avatar || `https://i.pravatar.cc/100?u=1`} className="w-8 h-8 rounded-full border-2 border-bg-primary" />
                  <img src={c.receiver.avatar || `https://i.pravatar.cc/100?u=2`} className="w-8 h-8 rounded-full border-2 border-bg-primary" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-text-main italic truncate tracking-tight">{c.sender.nickname} <span className="text-accent">↔</span> {c.receiver.nickname}</p>
                  <p className="text-[9px] text-text-dim truncate mt-0.5">{c.mediaType === 'voice' ? '🎤 Голосовое' : c.content || 'Медиа'}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-dim" />
            </div>
          ))}
        </div>
      )}

      {view === 'reviews' && (
        <div className="space-y-4">
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button onClick={() => setAdminFilter('')} className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", !adminFilter ? "bg-accent text-white" : "bg-bg-secondary text-text-dim border border-slate-800/50")}>Все</button>
              {Array.from(new Set(reviews.map(r => r.admin.nickname))).map(name => (
                 <button key={name} onClick={() => setAdminFilter(name)} className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", adminFilter === name ? "bg-accent text-white" : "bg-bg-secondary text-text-dim border border-slate-800/50")}>{name}</button>
              ))}
           </div>
           
           <div className="space-y-3">
             {reviews.filter(r => !adminFilter || r.admin.nickname === adminFilter).map(r => (
               <div key={r.id} className="bg-bg-secondary border border-slate-800/50 p-6 rounded-[2.5rem] space-y-4">
                 <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                     <img src={r.user.avatar || ''} className="w-8 h-8 rounded-xl object-cover" />
                     <div>
                       <p className="text-[10px] font-black italic text-text-main leading-none">{r.user.nickname}</p>
                       <p className="text-[8px] text-text-dim uppercase font-bold mt-1">для @{r.admin.username}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-1 text-amber-500">
                     <span className="text-xs font-black italic">{r.rating}</span>
                     <Star size={12} fill="currentColor" />
                   </div>
                 </div>
                 {r.comment && <p className="text-xs italic text-text-main leading-relaxed">"{r.comment}"</p>}
                 {r.mediaUrl && <img src={r.mediaUrl} className="rounded-2xl w-full max-h-48 object-cover border border-slate-800" />}
                 <p className="text-[8px] text-text-dim uppercase font-black tracking-widest">{new Date(r.createdAt).toLocaleDateString()}</p>
               </div>
             ))}
           </div>
        </div>
      )}

      {view === 'broadcast' && (
        <form onSubmit={handleSendBroadcast} className="space-y-6">
          <div className="bg-blue-600/5 border border-blue-600/10 p-8 rounded-[3rem] text-center space-y-4">
             <Mail size={40} className="mx-auto text-blue-500" />
             <h2 className="text-xl font-black text-white italic">Мгновенная рассылка</h2>
             <p className="text-xs text-slate-400 italic px-4">Разовое сообщение всем участникам SoulLink. Будет отправлено в системный чат.</p>
          </div>
          <div className="space-y-4">
            <input required value={broadcastData.title} onChange={e => setBroadcastData({...broadcastData, title: e.target.value})} placeholder="Тема" className="w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl outline-none text-white italic font-black" />
            <textarea required value={broadcastData.content} onChange={e => setBroadcastData({...broadcastData, content: e.target.value})} placeholder="Текст сообщения..." className="w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl outline-none text-white italic min-h-[150px]" />
          </div>
          <button type="submit" className="w-full bg-blue-600 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Разослать всем</button>
        </form>
      )}

      {view === 'sanctions' && (
        <form onSubmit={handleApplySanction} className="space-y-6">
          <div className="bg-rose-600/5 border border-rose-600/10 p-8 rounded-[3rem] text-center space-y-4">
             <Lock size={40} className="mx-auto text-rose-500" />
             <h2 className="text-xl font-black text-white italic">Юрисдикция</h2>
             <p className="text-xs text-slate-400 italic px-4">Блокировка доступа или выдача предупреждений по ID или никнейму.</p>
          </div>
          <div className="space-y-4">
            <input required value={sanctionData.targetId} onChange={e => setSanctionData({...sanctionData, targetId: e.target.value})} placeholder="Username или UID" className="w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl outline-none text-white font-bold" />
            <div className="grid grid-cols-2 gap-2">
               {['ban', 'warn', 'unban', 'unwarn'].map(a => (
                 <button key={a} type="button" onClick={() => setSanctionData({...sanctionData, action: a})} className={cn("py-4 rounded-2xl font-black uppercase text-[10px] border transition-all", sanctionData.action === a ? "bg-rose-600 border-rose-500 text-white" : "bg-slate-900 border-slate-800 text-slate-500")}>{a}</button>
               ))}
            </div>
            <textarea value={sanctionData.reason} onChange={e => setSanctionData({...sanctionData, reason: e.target.value})} placeholder="Обоснование..." className="w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl outline-none text-white italic min-h-[100px]" />
          </div>
          <button type="submit" className="w-full bg-rose-600 py-6 rounded-[2rem] font-black uppercase text-[11px] shadow-xl shadow-rose-600/20">Привести в исполнение</button>
        </form>
      )}

      {view === 'rules' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
          <h3 className="text-2xl font-black text-white italic tracking-tighter">Устав SoulLink</h3>
          <div className="space-y-4">
            {["Строгая анонимность", "Запрет на деанон", "Этика и поддержка", "Мгновенная реакция"].map((r, i) => (
              <div key={i} className="flex gap-4 items-center bg-slate-800/30 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-blue-500">{i+1}</span>
                <p className="text-sm text-slate-300 italic font-medium">{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value }: { label: string, value: any }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem]">
    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-black text-white italic tracking-tighter">{value || 0}</p>
  </div>
);
