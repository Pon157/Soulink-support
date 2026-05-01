import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Star, Bell, Mic, Camera, ArrowRight, CheckCheck, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { uploadFile } from '../../lib/services';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

import { Modal } from '../ui/Modal';

export const ChatView = ({ chatId, onBack, onImageClick, userRole }: { chatId: string, onBack: () => void, onImageClick: (url: string) => void, userRole: string }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorModal, setErrorModal] = useState<string|null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await apiFetch(`/api/messages/${chatId}`);
        const data = await res.json();
        if (Array.isArray(data)) setMessages(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (content?: string, mediaUrl?: string, mediaType?: string) => {
    if (!content?.trim() && !mediaUrl) return;
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: chatId, content, mediaUrl, mediaType }),
      });
      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
      setInput('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadFile(file);
      await handleSend('', url, file.type.startsWith('image/') ? 'photo' : 'file');
    } catch (error) {
      setErrorModal('Ошибка при загрузке. Файл может быть слишком большим.');
    } finally {
      setUploading(false);
    }
  };

  const handleRate = async (rating: number) => {
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ adminId: chatId, rating }),
      });
      setShowRating(false);
      // Success feedback without alert
    } catch (e) {
      setErrorModal('Не удалось отправить оценку');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#17212b]">
      <Modal isOpen={!!errorModal} onClose={() => setErrorModal(null)} title="Внимание">
        <div className="text-center space-y-6">
          <p className="text-rose-400 font-bold italic">{errorModal}</p>
          <button onClick={() => setErrorModal(null)} className="w-full bg-slate-800 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Понятно</button>
        </div>
      </Modal>

      {/* ... header */}
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-md">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={28} className="rotate-180" /></button>
          <div className="ml-2">
            <h3 className="font-black text-white tracking-tight leading-none text-base italic">Specialist</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
               <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">в сети</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userRole === 'USER' && <button onClick={() => setShowRating(true)} className="p-3 bg-blue-600/10 text-blue-400 rounded-2xl hover:bg-blue-600/20 transition-all"><Star size={20} /></button>}
        </div>
      </header>
      {/* ... rest of the file */}

      {showRating && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-lg flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] text-center space-y-6 max-w-sm">
            <h4 className="text-xl font-black text-white italic">Оцените работу</h4>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => handleRate(s)} className="text-amber-400 hover:scale-125 transition-transform"><Star size={32} /></button>
              ))}
            </div>
            <button onClick={() => setShowRating(false)} className="w-full bg-slate-800 text-slate-400 py-3 rounded-2xl">Отмена</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={cn(
              "max-w-[85%] p-3.5 rounded-3xl relative",
              msg.senderId !== chatId ? "bg-[#2b5278] text-white ml-auto" : "bg-[#242f3d] text-slate-100 mr-auto"
            )}
          >
            {msg.mediaType === 'photo' ? (
              <img src={msg.mediaUrl} className="rounded-2xl w-full cursor-zoom-in" onClick={() => onImageClick(msg.mediaUrl)} />
            ) : <p className="text-sm font-medium">{msg.content}</p>}
            <div className="flex items-center justify-end gap-1.5 mt-1 opacity-60">
              <span className="text-[9px] uppercase">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {msg.senderId !== chatId && <CheckCheck size={14} className={msg.read ? "text-blue-400" : "text-slate-400"} />}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#0f172a] flex items-center gap-3">
        <label className="text-slate-500 hover:text-blue-400 p-2 cursor-pointer">
          {uploading ? <Loader2 className="animate-spin" size={26} /> : <Camera size={26} />}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        </label>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder="Ваш ответ..." 
          className="flex-1 bg-slate-800/50 rounded-3xl px-4 py-3 text-sm focus:outline-none text-white border border-slate-800"
        />
        <button onClick={() => handleSend(input)} className="bg-blue-600 p-3 rounded-2xl text-white"><ArrowRight size={24} /></button>
      </div>
    </div>
  );
};
