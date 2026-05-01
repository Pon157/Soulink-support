import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Shield, Bell, Palette, HelpCircle, User as UserIcon, LogOut, ChevronRight, Loader2 } from 'lucide-react';
import { uploadFile, updateProfile } from '../../lib/services';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const SettingsView = ({ user, setUser, onLogout }: { user: any, setUser: (u: any) => void, onLogout: () => void }) => {
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadFile(file);
      const updatedUser = await updateProfile({ avatar: url });
      setUser(updatedUser);
    } catch (error) {
      alert('Ошибка при загрузке аватара');
    } finally {
      setUploading(false);
    }
  };

  const handleNicknameChange = async () => {
    const newNickname = prompt('Введите новый никнейм:', user.nickname);
    if (!newNickname || newNickname === user.nickname) return;

    try {
      const updatedUser = await updateProfile({ nickname: newNickname });
      setUser(updatedUser);
    } catch (error) {
      alert('Ошибка при обновлении профиля');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-[#0f172a]">
      <div className="p-8">
        <header className="mb-10 text-center">
           <div className="relative inline-block group">
             <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
             <img 
               src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} 
               className="relative w-32 h-32 rounded-[3.5rem] border-4 border-slate-900 shadow-2xl object-cover" 
               alt="me" 
             />
             <label className="absolute bottom-1 right-1 bg-blue-600 p-3 rounded-2xl text-white shadow-xl hover:scale-110 transition-transform cursor-pointer">
               {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
               <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
             </label>
           </div>
           <h2 className="text-3xl font-black text-white italic tracking-tighter mt-6">{user.nickname}</h2>
           <p className="text-blue-500 text-xs font-black uppercase tracking-[0.3em] mt-1">{user.role}</p>
        </header>

        <div className="space-y-3">
          <button 
            onClick={handleNicknameChange}
            className="w-full bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between group hover:border-slate-700 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
                <UserIcon size={20} />
              </div>
              <span className="text-sm font-black text-slate-100 italic tracking-tight">Изменить никнейм</span>
            </div>
            <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors" />
          </button>

          {[
            { label: 'Безопасность и пароль', icon: Shield, color: 'text-emerald-400' },
            { label: 'Настройки уведомлений', icon: Bell, color: 'text-amber-400' },
            { label: 'Оформление (Темы)', icon: Palette, color: 'text-purple-400' },
            { label: 'Помощь и FAQ', icon: HelpCircle, color: 'text-slate-400' },
          ].map((item, i) => (
            <button 
              key={i} 
              className="w-full bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between group hover:border-slate-700 transition-all text-left"
            >
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

        <p className="text-center text-slate-600 text-[9px] font-black uppercase tracking-[0.4em] mt-12 italic">SoulLink v2.1.0 - S3 Connected</p>
      </div>
    </div>
  );
};
