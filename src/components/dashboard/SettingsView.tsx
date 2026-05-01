import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Shield, Bell, Palette, HelpCircle, User as UserIcon, LogOut, ChevronRight, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadFile, updateProfile } from '../../lib/services';
import { apiFetch } from '../../lib/api';
import { Modal } from '../ui/Modal';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const SettingsView = ({ user, setUser, onLogout }: { user: any, setUser: (u: any) => void, onLogout: () => void }) => {
  const [uploading, setUploading] = useState(false);
  const [showNickModal, setShowNickModal] = useState(false);
  const [newNick, setNewNick] = useState(user.nickname);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [passwords, setPasswords] = useState({ old: '', new: '' });

  const themes = [
    { id: 'dark', label: 'Dark Slate', color: 'bg-[#0f172a]' },
    { id: 'oled', label: 'OLED Black', color: 'bg-[#000000]' },
    { id: 'light', label: 'Pure White', color: 'bg-white' },
    { id: 'forest', label: 'Emerald Forest', color: 'bg-[#061f14]' },
  ];

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      const updatedUser = await updateProfile({ avatar: url });
      setUser(updatedUser);
    } catch (error) {
      setErrorModal('Не удалось обновить аватар.');
    } finally {
      setUploading(false);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      const updatedUser = await updateProfile({ banner: url });
      setUser(updatedUser);
    } catch (error) {
      setErrorModal('Не удалось обновить баннер.');
    } finally {
      setUploading(false);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    try {
      const updatedUser = await updateProfile({ theme: themeId });
      setUser(updatedUser);
      // MainDashboard will handle document attribute
    } catch (e) {
      setErrorModal('Ошибка сохранения темы');
    }
  };

  const handleUpdateNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNick || newNick === user.nickname) return;
    try {
      const updatedUser = await updateProfile({ nickname: newNick });
      setUser(updatedUser);
      setShowNickModal(false);
    } catch (error) {
      setErrorModal('Ошибка при обновлении профиля');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwords)
      });
      if (res.ok) {
        setShowSecurity(false);
        setPasswords({ old: '', new: '' });
        alert('Пароль успешно изменен');
      } else {
        const d = await res.json();
        setErrorModal(d.error || 'Ошибка смены пароля');
      }
    } catch (e) {
      setErrorModal('Ошибка сети');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 relative bg-bg-primary">
      <Modal isOpen={showNickModal} onClose={() => setShowNickModal(false)} title="Сменить имя">
        <form onSubmit={handleUpdateNickname} className="space-y-4">
          <input value={newNick} onChange={e => setNewNick(e.target.value)} className="w-full bg-bg-secondary p-4 rounded-2xl outline-none text-text-main font-bold italic" placeholder="Новый никнейм" />
          <button type="submit" className="w-full bg-accent py-4 rounded-2xl font-black uppercase text-[10px]">Применить</button>
        </form>
      </Modal>

      <Modal isOpen={showSecurity} onClose={() => setShowSecurity(false)} title="Защита аккаунта">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <input type="password" required value={passwords.old} onChange={e => setPasswords({...passwords, old: e.target.value})} className="w-full bg-bg-secondary p-4 rounded-2xl outline-none text-text-main" placeholder="Старый пароль" />
          <input type="password" required value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="w-full bg-bg-secondary p-4 rounded-2xl outline-none text-text-main" placeholder="Новый пароль" />
          <button type="submit" className="w-full bg-accent py-5 rounded-2xl font-black uppercase text-[10px] mt-4">Обновить пароль</button>
        </form>
      </Modal>

      <Modal isOpen={showTheme} onClose={() => setShowTheme(false)} title="Персонализация">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
             {themes.map(t => (
               <button 
                key={t.id} 
                onClick={() => handleThemeChange(t.id)}
                className={cn(
                  "p-4 rounded-3xl border-2 transition-all text-left",
                  user.theme === t.id ? "border-accent bg-accent/10" : "border-slate-800 bg-bg-secondary"
                )}
               >
                 <div className={cn("w-8 h-8 rounded-full mb-3", t.color, t.id === 'light' ? 'border' : '')} />
                 <p className="text-[10px] font-black uppercase tracking-widest">{t.label}</p>
               </button>
             ))}
          </div>
          <div className="space-y-3">
             <p className="text-[10px] font-black uppercase text-text-dim px-2">Фоновый баннер</p>
             <label className="flex items-center justify-between bg-bg-secondary p-4 rounded-2xl border border-slate-800 cursor-pointer">
                <div className="flex items-center gap-3">
                  <ImageIcon size={20} className="text-accent" />
                  <span className="text-sm font-bold italic tracking-tight">Загрузить свои обои</span>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleBannerChange} />
                <ChevronRight size={18} />
             </label>
          </div>
        </div>
      </Modal>

      <div className="p-8">
        <header className="mb-10 text-center relative pt-12">
            <div className="absolute inset-0 top-0 h-48 -mx-8 overflow-hidden">
               {user.banner ? (
                  <img src={user.banner} className="w-full h-full object-cover blur-[2px] brightness-50" />
               ) : (
                  <div className="w-full h-full bg-gradient-to-b from-blue-600/20 to-transparent" />
               )}
            </div>
            
           <div className="relative inline-block group mb-4">
             <img src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} className="relative w-32 h-32 rounded-[3.5rem] border-4 border-bg-primary shadow-2xl object-cover" />
             <label className="absolute bottom-1 right-1 bg-accent p-3 rounded-2xl text-white shadow-xl hover:scale-110 transition-transform cursor-pointer">
               {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
               <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
             </label>
           </div>
           <h2 className="text-3xl font-black text-text-main italic tracking-tighter relative z-10">{user.nickname}</h2>
           <p className="text-accent text-[10px] font-black uppercase tracking-[0.3em] mt-1 relative z-10">{user.role}</p>
        </header>

        <div className="space-y-3">
          <button onClick={() => setShowNickModal(true)} className="w-full bg-bg-secondary border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between group hover:border-slate-700 transition-all text-left">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-bg-primary text-accent"><UserIcon size={20} /></div>
              <span className="text-sm font-black text-text-main italic tracking-tight">Профиль</span>
            </div>
            <ChevronRight size={18} className="text-text-dim" />
          </button>

          {[
            { label: 'Безопасность', icon: Shield, color: 'text-emerald-400', onClick: () => setShowSecurity(true) },
            { label: 'Оформление', icon: Palette, color: 'text-purple-400', onClick: () => setShowTheme(true) },
            { label: 'Помощь', icon: HelpCircle, color: 'text-slate-400', onClick: () => setShowHelp(true) },
          ].map((item, i) => (
            <button key={i} onClick={item.onClick} className="w-full bg-bg-secondary border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between group hover:border-slate-700 transition-all text-left">
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-xl bg-bg-primary", item.color)}><item.icon size={20} /></div>
                <span className="text-sm font-black text-text-main italic tracking-tight">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-text-dim" />
            </button>
          ))}
        </div>

        <button onClick={onLogout} className="w-full mt-8 bg-rose-500/10 border border-rose-500/20 text-rose-500 p-5 rounded-[2rem] flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all">
          <LogOut size={20} /> Выйти
        </button>
      </div>
    </div>
  );
};
