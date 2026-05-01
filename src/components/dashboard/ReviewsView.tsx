import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, MessageSquare, ImageIcon, Filter, ChevronDown, User as UserIcon, Shield } from 'lucide-react';
import { apiFetch } from '../../lib/api';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const ReviewsView = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAdmin, setFilterAdmin] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating'>('newest');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reviewsRes, adminsRes] = await Promise.all([
          apiFetch('/api/reviews/all'),
          apiFetch('/api/admins')
        ]);
        const rData = await reviewsRes.json();
        const aData = await adminsRes.json();
        setReviews(rData);
        setAdmins(aData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredReviews = reviews
    .filter(r => !filterAdmin || r.adminId === filterAdmin)
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-bg-primary pb-24">
      <header className="mb-8">
        <h2 className="text-3xl font-black italic tracking-tighter text-text-main">Отзывы</h2>
        <p className="text-text-dim text-[10px] font-black uppercase tracking-widest mt-1 italic">Честное мнение нашего сообщества</p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <select 
            value={filterAdmin} 
            onChange={(e) => setFilterAdmin(e.target.value)}
            className="w-full bg-bg-secondary border border-slate-800 p-4 rounded-2xl outline-none text-text-main text-xs font-black uppercase tracking-widest appearance-none"
          >
            <option value="">Все администраторы</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>@{a.nickname}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-dim"><ChevronDown size={14} /></div>
        </div>

        <button 
          onClick={() => setSortBy(s => s === 'newest' ? 'rating' : 'newest')}
          className="bg-bg-secondary border border-slate-800 px-6 py-4 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-main hover:border-accent transition-all"
        >
          <Filter size={14} className="text-accent" />
          {sortBy === 'newest' ? 'Сначала новые' : 'По рейтингу'}
        </button>
      </div>

      <div className="grid gap-4">
        {loading && <p className="text-center py-12 text-text-dim font-black uppercase text-[10px] tracking-widest animate-pulse">Загрузка мнений...</p>}
        {!loading && filteredReviews.length === 0 && (
          <div className="text-center py-20 bg-bg-secondary/30 rounded-[3rem] border border-dashed border-slate-800">
             <Star size={40} className="mx-auto text-slate-700 mb-4" />
             <p className="text-text-dim italic">Отзывов пока нет.</p>
          </div>
        )}
        {filteredReviews.map(review => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={review.id} 
            className="bg-bg-secondary p-6 rounded-[2.5rem] border border-slate-800/50 space-y-4 hover:border-accent/20 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={review.user.avatar || `https://i.pravatar.cc/100?u=${review.userId}`} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <p className="text-xs font-black italic text-text-main">{review.user.nickname}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-text-dim uppercase font-black tracking-widest">оценил</span>
                    <span className="text-[10px] text-accent font-black">@{review.admin.nickname}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 rounded-full text-amber-500">
                <span className="text-xs font-black italic">{review.rating}</span>
                <Star size={12} fill="currentColor" />
              </div>
            </div>

            {review.comment && (
              <p className="text-sm italic text-text-main leading-relaxed relative pl-4 border-l-2 border-accent/20">"{review.comment}"</p>
            )}

            {review.mediaUrl && (
              <img src={review.mediaUrl} className="rounded-2xl w-full max-h-60 object-cover border border-slate-800 shadow-xl" />
            )}

            <p className="text-[8px] text-text-dim uppercase font-black tracking-widest opacity-60 text-right">{new Date(review.createdAt).toLocaleDateString()}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
