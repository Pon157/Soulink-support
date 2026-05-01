import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Users, FileText, ShieldAlert, Shield, Star, Plus, ShieldCheck, Mail, Lock } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Modal } from '../ui/Modal';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const SystemDashboard = ({ role }: { role: string }) => {
  const [view, setView] = useState<'stats' | 'staff' | 'rules' | 'moderation' | 'channels' | 'reviews'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ nickname: '', username: '', password: '', role: 'ADMIN' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [statsRes, staffRes, reportsRes, revRes, broadRes] = await Promise.all([
        apiFetch('/api/stats/system'),
        apiFetch('/api/staff'),
        apiFetch('/api/moderation/reports'),
        apiFetch('/api/reviews/all'),
        apiFetch('/api/broadcasts')
      ]);
      setStats(await statsRes.json());
      setStaff(await staffRes.json());
      setReports(await reportsRes.json());
      if (revRes.ok) setReviews(await revRes.json());
      if (broadRes.ok) setBroadcasts(await broadRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/staff/create', {
        method: 'POST',
        body: JSON.stringify(newStaff),
      });
      if (res.ok) {
        setShowAddStaff(false);
        fetchData();
        setNewStaff({ nickname: '', username: '', password: '', role: 'ADMIN' });
      } else {
        const d = await res.json();
        alert(d.error || 'Ошибка');
      }
    } catch (e) {
      alert('Ошибка сети');
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Загрузка...</div>;

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-[#0f172a] p-6">
      <Modal isOpen={showAddStaff} onClose={() => setShowAddStaff(false)} title="Новый сотрудник">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Имя / Псевдоним</label>
            <input 
              required value={newStaff.nickname} 
              onChange={e => setNewStaff({...newStaff, nickname: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-blue-500" 
              placeholder="Напр: Алексей"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Логин</label>
            <input 
              required value={newStaff.username} 
              onChange={e => setNewStaff({...newStaff, username: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-blue-500" 
              placeholder="Напр: alex_admin"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Пароль</label>
            <input 
              type="password" required value={newStaff.password} 
              onChange={e => setNewStaff({...newStaff, password: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-blue-500" 
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Должность</label>
            <select 
              value={newStaff.role} 
              onChange={e => setNewStaff({...newStaff, role: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-blue-500 appearance-none"
            >
              <option value="ADMIN">Администратор</option>
              <option value="CURATOR">Куратор</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-4">Назначить</button>
        </form>
      </Modal>

      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none">Management</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 px-1">Ранг: {role}</p>
        </div>
        {role === 'OWNER' && view === 'staff' && (
          <button 
            onClick={() => setShowAddStaff(true)}
            className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20"
          >
            <Plus size={24} />
          </button>
        )}
      </header>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'stats', label: 'Данные', icon: BarChart3 },
          { id: 'staff', label: 'Штат', icon: Users },
          { id: 'moderation', label: 'Жалобы', icon: ShieldAlert },
          { id: 'channels', label: 'Каналы', icon: Mail },
          { id: 'reviews', label: 'Отзывы', icon: Star },
          { id: 'rules', label: 'Устав', icon: FileText },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all whitespace-nowrap",
              view === tab.id ? "bg-blue-600 text-white shadow-xl" : "bg-slate-800 text-slate-500"
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
             <StatCard label="Сообщения" value={stats?.totalMessages || 0} color="blue" />
             <StatCard label="Пользователи" value={stats?.totalUsers || 0} color="emerald" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">График нагрузки</h3>
            <div className="h-32 flex items-end justify-between gap-1 px-2">
              {(stats?.dailyStats || [30, 50, 40, 70, 45, 90, 60, 50, 80, 40]).map((h: number, i: number) => (
                <div key={i} className="flex-1 bg-blue-600/10 rounded-t-lg relative group transition-all hover:bg-blue-600/30" style={{ height: `${h}%` }}>
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500 rounded-full blur-[1px]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'staff' && (
        <div className="space-y-3">
          {staff.map(s => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between group hover:border-slate-700 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center font-black overflow-hidden relative">
                   <img src={s.avatar || `https://i.pravatar.cc/100?u=${s.id}`} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <p className="font-black text-white italic tracking-tight">{s.nickname}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">@{s.username}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn(
                  "text-[8px] font-black uppercase px-2 py-1 rounded-lg",
                  s.role === 'ADMIN' ? "bg-blue-600/10 text-blue-400" : "bg-purple-600/10 text-purple-400"
                )}>{s.role}</span>
                <div className="flex items-center gap-1 text-amber-500">
                  <span className="text-[10px] font-black italic">{(s.stats?.averageRating || 0).toFixed(1)}</span>
                  <Star size={10} fill="currentColor" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'moderation' && (
        <div className="space-y-6">
          <div className="relative">
            <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Поиск по nickname или UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-4 pl-12 rounded-2xl outline-none text-white focus:border-rose-500/50"
            />
          </div>
          <div className="space-y-3">
            {reports.length === 0 ? (
               <div className="p-12 text-center text-slate-600 italic font-medium">Жалоб пока нет</div>
            ) : reports.map(r => (
              <div key={r.id} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-rose-400 italic">{r.reason}</p>
                  <p className="text-[9px] text-slate-500 uppercase mt-1">Отправитель: {r.reporterId} • Нарушитель: {r.targetId}</p>
                </div>
                <div className="flex gap-2">
                  <button className="bg-rose-600/10 text-rose-500 text-[9px] font-black uppercase px-4 py-2 rounded-xl">Бан</button>
                  <button className="bg-slate-800 text-slate-400 text-[9px] font-black uppercase px-4 py-2 rounded-xl">Игнор</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="p-12 text-center text-slate-600 italic font-medium">Отзывов пока нет</div>
          ) : reviews.map(r => (
            <div key={r.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={r.user?.avatar || `https://i.pravatar.cc/100?u=${r.userId}`} className="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <p className="text-[10px] font-black text-white italic tracking-tight">{r.user?.nickname || 'Anon'}</p>
                    <div className="flex gap-0.5">{Array(r.rating).fill(0).map((_, i) => <Star key={i} size={8} className="text-amber-500" fill="currentColor" />)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">На специалиста</p>
                  <p className="text-[10px] font-black text-blue-400 italic">@{r.admin?.username}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 italic leading-relaxed bg-slate-800/10 p-4 rounded-2xl border border-slate-800/50">"{r.comment}"</p>
              <p className="text-[8px] text-slate-600 uppercase font-black tracking-[0.2em] px-2">{new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          ))}
        </div>
      )}

      {view === 'channels' && (
        <div className="space-y-4">
          <div className="bg-blue-600/10 border border-blue-600/20 p-8 rounded-[3rem] text-center space-y-4 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/50"></div>
             <Mail size={40} className="mx-auto text-blue-500" />
             <h4 className="text-2xl font-black text-white italic tracking-tighter leading-none">Внутренние рассылки</h4>
             <p className="text-xs text-slate-400 italic max-w-xs mx-auto">Каналы для важной информации, обновлений правил и объявлений состава администрации.</p>
             <button className="bg-blue-600 text-white font-black uppercase text-[10px] px-8 py-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Создать канал</button>
          </div>
          {broadcasts.map(b => (
            <div key={b.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] space-y-3 relative overflow-hidden">
               <div className="flex items-center justify-between relative z-10">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                    b.author === 'SYSTEM' ? "bg-rose-600/10 text-rose-500" : "bg-blue-600/10 text-blue-500"
                  )}>{b.author}</span>
                  <span className="text-[9px] text-slate-600 font-bold">{new Date(b.createdAt).toLocaleDateString()}</span>
               </div>
               <h5 className="font-black text-white italic tracking-tight relative z-10">{b.title}</h5>
               <p className="text-sm text-slate-400 italic leading-relaxed relative z-10">{b.content}</p>
            </div>
          ))}
        </div>
      )}

      {view === 'rules' && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mb-2">
            <FileText size={32} />
          </div>
          <h3 className="text-2xl font-black text-white italic tracking-tighter">Внутренний устав</h3>
          <div className="space-y-4">
            {[
              "Эмпатия — наш главный приоритет.",
              "Никакой деанонимизации пользователей.",
              "Запрет на личные советы вне контекста.",
              "Время ответа не более 5 минут."
            ].map((rule, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-500 flex-shrink-0 flex items-center justify-center text-[10px] font-black">{i+1}</div>
                <p className="text-sm text-slate-300 font-medium leading-relaxed italic">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string, value: any, color: string }) => (
  <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl">
    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
    <span className="text-3xl font-black text-white">{value}</span>
  </div>
);
