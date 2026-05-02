import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Shield, X, MapPin, Calendar, Briefcase, Award } from 'lucide-react';
import { Modal } from './Modal';
import { UserAvatar } from './UserAvatar';
import { apiFetch } from '../../lib/api';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
  onChat?: (userId: string) => void;
}

export const UserProfileModal = ({ userId, onClose, onChat }: UserProfileModalProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      try {
        const res = await apiFetch(`/api/users/profile/${userId}`);
        if (res.ok) setProfile(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  return (
    <Modal isOpen={!!userId} onClose={onClose} title="Информация">
      {loading ? (
        <div className="py-12 text-center text-text-dim text-[10px] font-black uppercase tracking-widest animate-pulse">
          Загрузка профиля...
        </div>
      ) : profile ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center">
             <div className="relative mb-6">
                <div className="absolute inset-0 bg-accent blur-3xl opacity-20" />
                <UserAvatar user={profile} size={112} className="relative ring-4 ring-bg-secondary shadow-2xl" />
                {profile.isOnRest && (
                  <div className="absolute -bottom-2 right-0 bg-rose-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full border-2 border-bg-secondary shadow-lg">
                    Rest
                  </div>
                )}
             </div>
             
             <div className="space-y-1">
                <h3 className="text-2xl font-black text-text-main italic tracking-tight">{profile.nickname}</h3>
                <div className="flex items-center justify-center gap-2">
                   <Shield size={12} className={profile.role === 'USER' ? 'text-text-dim' : 'text-accent'} />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">{profile.role}</p>
                </div>
             </div>
          </div>

          {profile.description && (
            <div className="bg-bg-primary/50 backdrop-blur-sm p-5 rounded-[2rem] border border-slate-800/50">
              <p className="text-xs text-text-dim italic leading-relaxed text-center">"{profile.description}"</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
             <div className="bg-bg-secondary p-4 rounded-3xl border border-slate-800/50">
                <div className="flex items-center gap-2 text-amber-500 mb-1">
                  <Star size={14} fill="currentColor" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Рейтинг</span>
                </div>
                <p className="text-2xl font-black italic tracking-tighter">{(profile.stats?.averageRating || 0).toFixed(1)}</p>
             </div>
             <div className="bg-bg-secondary p-4 rounded-3xl border border-slate-800/50">
                <div className="flex items-center gap-2 text-accent mb-1">
                  <Award size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Отзывов</span>
                </div>
                <p className="text-2xl font-black italic tracking-tighter">{profile.reviewsCount || 0}</p>
             </div>
          </div>

          <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary rounded-2xl border border-slate-800/30">
                  <Calendar size={14} className="text-text-dim" />
                  <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Зарегистрирован {new Date(profile.createdAt).toLocaleDateString()}</p>
              </div>
              {profile.lastSeen && (
                <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary rounded-2xl border border-slate-800/30">
                    <div className={cn("w-2 h-2 rounded-full", Date.now() - new Date(profile.lastSeen).getTime() < 120000 ? "bg-emerald-500 shadow-emerald-500/20" : "bg-slate-600")} />
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">
                        {Date.now() - new Date(profile.lastSeen).getTime() < 120000 ? 'Онлайн' : `Был в сети ${new Date(profile.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                </div>
              )}
          </div>

          {onChat && profile.id !== profile.currentUserId && (
            <button 
              onClick={() => { onChat(profile.id); onClose(); }}
              className="w-full bg-accent text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-accent/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <MessageSquare size={20} />
              Написать сообщение
            </button>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-text-dim italic">Профиль не найден.</div>
      )}
    </Modal>
  );
};
