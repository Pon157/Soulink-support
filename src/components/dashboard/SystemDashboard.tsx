import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Users, FileText, ShieldAlert, Shield, Star } from 'lucide-react';
import { apiFetch } from '../../lib/api';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const SystemDashboard = ({ role }: { role: string }) => {
  const [view, setView] = useState<'stats' | 'staff' | 'rules' | 'moderation'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, staffRes] = await Promise.all([
          apiFetch('/api/stats/system'),
          apiFetch('/api/staff')
        ]);
        setStats(await statsRes.json());
        setStaff(await staffRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Загрузка...</div>;

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-[#0f172a] p-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter">Панель Управления</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Ранг: {role}</p>
        </div>
        <div className="w-12 h-12 bg-rose-600/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20">
          <Shield size={24} />
        </div>
      </header>

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
             <StatCard label="Юзеры" value={stats?.totalUsers || 0} color="emerald" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">График активности</h3>
            <div className="h-32 flex items-end justify-between gap-1">
              {(stats?.dailyStats || [30, 50, 40, 70, 45, 90, 60]).map((h: number, i: number) => (
                <div key={i} className="flex-1 bg-blue-600/20 rounded-t-lg relative group" style={{ height: `${h}%` }}>
                  <div className="bg-blue-500 w-full h-1 rounded-t-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'staff' && (
        <div className="space-y-3">
          {staff.map(s => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black">{s.nickname[0]}</div>
                <div>
                  <p className="font-black text-white italic">{s.nickname}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">{s.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-blue-400">
                <span className="text-sm font-black italic">{(s.stats?.averageRating || 0).toFixed(1)}</span>
                <Star size={12} fill="currentColor" />
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'rules' && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-4">
          <h3 className="text-xl font-black text-white italic">Внутренний устав</h3>
          <p className="text-sm text-slate-400 leading-relaxed italic">1. Всегда проявлять эмпатию.<br/>2. Тщательно фильтровать запросы.<br/>3. Хранить конфиденциальность.</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string, value: any, color: string }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl">
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
      <span className="text-3xl font-black text-white">{value}</span>
    </div>
  );
};
