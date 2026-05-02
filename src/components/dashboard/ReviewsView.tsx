import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, MessageSquare, ImageIcon, Filter, ChevronDown, User as UserIcon, Shield, Send, X, Reply } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { UserAvatar } from '../ui/UserAvatar';
import { Modal } from '../ui/Modal';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const ReviewsView = ({ onImageClick, onProfileClick }: { onImageClick: (url: string) => void, onProfileClick: (id: string) => void }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAdmin, setFilterAdmin] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating'>('newest');
  
  const [selectedReviewForDiscussion, setSelectedReviewForDiscussion] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);

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

  const fetchComments = async (reviewId: string) => {
    try {
        const res = await apiFetch(`/api/reviews/${reviewId}/comments`);
        setComments(await res.json());
    } catch (e) { console.error(e); }
  }

  const handleSendComment = async () => {
      if (!newComment || !selectedReviewForDiscussion) return;
      try {
          await apiFetch(`/api/reviews/${selectedReviewForDiscussion.id}/comments`, {
              method: 'POST',
              body: JSON.stringify({ content: newComment, replyToId: replyingTo?.id })
          });
          setNewComment('');
          setReplyingTo(null);
          fetchComments(selectedReviewForDiscussion.id);
      } catch (e) { console.error(e); }
  }

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
              <button onClick={() => onProfileClick(review.userId)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <UserAvatar user={{ ...review.user, id: review.userId }} size={40} className="shadow-lg" />
                <div className="text-left">
                  <p className="text-xs font-black italic text-text-main">{review.user.nickname}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-text-dim uppercase font-black tracking-widest">оценил</span>
                    <span className="text-[10px] text-accent font-black">@{review.admin.nickname}</span>
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 rounded-full text-amber-500">
                <span className="text-xs font-black italic">{review.rating}</span>
                <Star size={12} fill="currentColor" />
              </div>
            </div>

            {review.comment && (
              <p className="text-sm italic text-text-main leading-relaxed relative pl-4 border-l-2 border-accent/20">"{review.comment}"</p>
            )}

            {review.mediaUrl && (
              <img src={review.mediaUrl} className="rounded-2xl w-full max-h-60 object-cover border border-slate-800 shadow-xl cursor-zoom-in" onClick={() => onImageClick(review.mediaUrl)} />
            )}

            <div className="flex items-center justify-between">
                <button 
                    onClick={() => { setSelectedReviewForDiscussion(review); fetchComments(review.id); }}
                    className="flex items-center gap-2 text-text-dim hover:text-accent transition-colors"
                >
                    <MessageSquare size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Обсудить отзыв</span>
                </button>
                <p className="text-[8px] text-text-dim uppercase font-black tracking-widest opacity-60">{new Date(review.createdAt).toLocaleDateString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={!!selectedReviewForDiscussion} onClose={() => setSelectedReviewForDiscussion(null)} title="Обсуждение отзыва">
          <div className="flex flex-col h-[60vh]">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
                  {comments.length === 0 && <p className="text-center py-12 text-text-dim italic text-xs">Пока нет комментариев...</p>}
                  {comments.map(c => (
                      <div key={c.id} className="bg-bg-primary p-4 rounded-2xl border border-slate-800/50 group relative">
                           <button onClick={() => onProfileClick(c.userId)} className="flex items-center gap-2 mb-2 hover:opacity-70 transition-opacity">
                                <UserAvatar user={{ ...c.user, id: c.userId }} size={24} className="rounded-lg shadow-sm" />
                                <span className="text-[10px] font-black italic">{c.user.nickname}</span>
                                {c.replyToId && <span className="text-[8px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full uppercase">ответ</span>}
                                <span className="text-[8px] text-text-dim ml-auto">{new Date(c.createdAt).toLocaleTimeString()}</span>
                           </button>
                           <p className="text-xs text-text-dim italic leading-relaxed">{c.content}</p>
                           <button onClick={() => setReplyingTo(c)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-accent transition-all"><Reply size={12} /></button>
                      </div>
                  ))}
              </div>
              <div className="pt-4 space-y-3">
                  {replyingTo && (
                      <div className="flex items-center justify-between bg-bg-secondary p-2 rounded-xl border-l-2 border-accent text-[10px] text-text-dim">
                          <span>В ответ {replyingTo.user.nickname}</span>
                          <button onClick={() => setReplyingTo(null)} className="p-1"><X size={12} /></button>
                      </div>
                  )}
                  <div className="flex gap-2">
                      <input 
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Ваш комментарий..."
                        className="flex-1 bg-bg-secondary p-4 rounded-2xl outline-none text-text-main border border-slate-800 text-xs italic"
                        onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                      />
                      <button onClick={handleSendComment} className="bg-accent text-white px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest"><Send size={18} /></button>
                  </div>
              </div>
          </div>
      </Modal>
    </div>
  );
};
