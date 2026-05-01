import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Shield, Bell, Palette, HelpCircle, User as UserIcon, LogOut, ChevronRight, Loader2 } from 'lucide-react';
import { uploadFile, updateProfile } from '../../lib/services';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

import { Modal } from '../ui/Modal';

export const SettingsView = ({ user, setUser, onLogout }: { user: any, setUser: (u: any) => void, onLogout: () => void }) => {
  const [uploading, setUploading] = useState(false);
  const [showNickModal, setShowNickModal] = useState(false);
  const [newNick, setNewNick] = useState(user.nickname);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [passwords, setPasswords] = useState({ old: '', new: '' });
  const [isOLED, setIsOLED] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadFile(file);
      const updatedUser = await updateProfile({ avatar: url });
      setUser(updatedUser);
    } catch (error) {
      setErrorModal('Не удалось обновить аватар. Возможно файл слишком большой.');
    } finally {
      setUploading(false);
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
      } else {
        const d = await res.json();
        setErrorModal(d.error || 'Ошибка смены пароля');
      }
    } catch (e) {
      setErrorModal('Ошибка сети');
    }
  };

  return (
    <div className={cn("flex-1 overflow-y-auto pb-24 relative transition-colors", isOLED ? "bg-black" : "bg-[#0f172a]")}>
      <Modal isOpen={showNickModal} onClose={() => setShowNickModal(false)} title="Сменить никнейм">
        <form onSubmit={handleUpdateNickname} className="space-y-4">
          <input 
            value={newNick} 
            onChange={e => setNewNick(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-blue-500 font-bold italic"
            placeholder="Новый никнейм"
          />
          <button type="submit" className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Сохранить</button>
        </form>
      </Modal>

      <Modal isOpen={showSecurity} onClose={() => setShowSecurity(false)} title="Безопасность">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Текущий пароль</label>
            <input 
              type="password" required value={passwords.old}
              onChange={e => setPasswords({...passwords, old: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Новый пароль</label>
            <input 
              type="password" required value={passwords.new}
              onChange={e => setPasswords({...passwords, new: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-blue-500"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-4">Обновить доступ</button>
        </form>
      </Modal>

      <Modal isOpen={showTheme} onClose={() => setShowTheme(false)} title="Оформление">
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-800/50 p-5 rounded-2xl border border-slate-800">
            <div>
              <p className="font-black text-white italic tracking-tight">OLED Dark Mode</p>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Максимально черный</p>
            </div>
            <button 
              onClick={() => setIsOLED(!isOLED)}
              className={cn("w-14 h-8 rounded-full relative transition-colors", isOLED ? "bg-blue-600" : "bg-slate-700")}
            >
              <div className={cn("absolute top-1 w-6 h-6 bg-white rounded-full transition-all", isOLED ? "right-1" : "left-1")} />
            </button>
          </div>
          <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-600/20">
            <p className="text-xs text-blue-400 italic">"SoulLink адаптируется под ваши предпочтения. Новые темы в разработке."</p>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Помощь и FAQ">
        <div className="space-y-4">
          {[
            { q: 'Как это работает?', a: 'Мы объединяем людей для анонимной психологической поддержки.' },
            { q: 'Это бесплатно?', a: 'Да, проект SoulLink существует благодаря волонтерам.' },
            { q: 'Как стать штатным специалистом?', a: 'Свяжитесь с @owner в дискорде для прохождения аттестации.' }
          ].map((faq, i) => (
            <div key={i} className="bg-slate-800/30 p-5 rounded-2xl border border-slate-800 space-y-2">
              <p className="font-black text-white text-xs italic tracking-tight">{faq.q}</p>
              <p className="text-xs text-slate-500 font-medium italic">{faq.a}</p>
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal(null)} title="Внимание">
        <div className="text-center space-y-6">
          <p className="text-rose-400 font-bold italic">{errorModal}</p>
          <button onClick={() => setErrorModal(null)} className="w-full bg-slate-800 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Понятно</button>
        </div>
      </Modal>

      <div className="p-8">
        {/* ... Profile header */}
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
            onClick={() => setShowNickModal(true)}
            className="w-full bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between group hover:border-slate-700 transition-all text-left relative z-10"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
                <UserIcon size={20} />
              </div>
              <span className="text-sm font-black text-slate-100 italic tracking-tight">Изменить никнейм</span>
            </div>
            <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors" />
          </button>
          {/* ... Rest of items */}

          {[
            { label: 'Безопасность и пароль', icon: Shield, color: 'text-emerald-400', onClick: () => setShowSecurity(true) },
            { label: 'Настройки уведомлений', icon: Bell, color: 'text-amber-400', onClick: () => {} },
            { label: 'Оформление (Темы)', icon: Palette, color: 'text-purple-400', onClick: () => setShowTheme(true) },
            { label: 'Помощь и FAQ', icon: HelpCircle, color: 'text-slate-400', onClick: () => setShowHelp(true) },
          ].map((item, i) => (
            <button 
              key={i} 
              onClick={item.onClick}
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
