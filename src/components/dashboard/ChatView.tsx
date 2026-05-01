import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Star, Mic, Camera, ArrowRight, CheckCheck, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { uploadFile } from '../../lib/services';
import { Modal } from '../ui/Modal';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const ChatView = ({ chatId, onBack, onImageClick, userRole }: { chatId: string, onBack: () => void, onImageClick: (url: string) => void, userRole: string }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [partner, setPartner] = useState<any>(null);
  const [input, setInput] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [errorModal, setErrorModal] = useState<string|null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        const res = await apiFetch(`/api/users/profile/${chatId}`);
        if (res.ok) setPartner(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchPartner();

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        setUploading(true);
        try {
          const url = await uploadFile(file);
          await handleSend('', url, 'voice');
        } catch (e) {
          setErrorModal('Ошибка отправки голосового');
        } finally {
          setUploading(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (e) {
      setErrorModal('Микрофон недоступен');
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
    setMediaRecorder(null);
  };

  const handleRatingSubmit = async () => {
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ adminId: chatId, rating, comment }),
      });
      setShowRating(false);
      setComment('');
    } catch (e) {
      setErrorModal('Не удалось отправить отзыв');
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

      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Профиль собеседника">
        {partner ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <img src={partner.avatar || `https://i.pravatar.cc/150?u=${partner.id}`} className="w-24 h-24 rounded-3xl object-cover border-2 border-slate-800 mb-4" />
              <h4 className="text-xl font-black text-white italic">{partner.nickname}</h4>
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">{partner.role}</p>
            </div>
            {partner.description && (
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 italic">"{partner.description}"</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Рейтинг</p>
                <div className="flex items-center gap-1.5 mt-1 text-amber-500">
                  <span className="text-lg font-black italic">{(partner.stats?.averageRating || 0).toFixed(1)}</span>
                  <Star size={16} fill="currentColor" />
                </div>
              </div>
              <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Отзывов</p>
                <p className="text-lg font-black text-white italic mt-1">{partner.reviewsCount || 0}</p>
              </div>
            </div>
          </div>
        ) : <p>Загрузка...</p>}
      </Modal>

      <Modal isOpen={showRating} onClose={() => setShowRating(false)} title="Оцените работу">
        <div className="text-center space-y-8">
          <p className="text-sm font-medium italic text-slate-400">Ваш отзыв поможет нам стать лучше</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={cn(
                  "p-2 transition-all transform hover:scale-110",
                  rating >= star ? "text-amber-500" : "text-slate-700"
                )}
              >
                <Star size={40} fill={rating >= star ? "currentColor" : "none"} strokeWidth={1} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Что вам понравилось (или нет)?"
            className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none text-white italic min-h-[100px]"
          />
          <button
            onClick={handleRatingSubmit}
            className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20"
          >
            Отправить отзыв
          </button>
        </div>
      </Modal>

      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-md">
        <div className="flex items-center cursor-pointer" onClick={() => setShowProfile(true)}>
          <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={28} className="rotate-180" /></button>
          <div className="ml-2">
            <h3 className="font-black text-white tracking-tight leading-none text-base italic">{partner?.nickname || 'Загрузка...'}</h3>
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
              <img src={msg.mediaUrl} className="rounded-2xl w-full cursor-zoom-in shadow-lg" onClick={() => onImageClick(msg.mediaUrl)} />
            ) : msg.mediaType === 'voice' ? (
              <div className="flex items-center gap-3 py-1 px-1 min-w-[160px]">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <Mic size={14} />
                </div>
                <audio src={msg.mediaUrl} controls className="h-8 w-full brightness-90 contrast-125 rounded-lg" />
              </div>
            ) : (
              <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
            )}
            <div className="flex items-center justify-end gap-1.5 mt-1 opacity-60 px-1">
              <span className="text-[9px] uppercase font-black tracking-widest">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {msg.senderId !== chatId && <CheckCheck size={14} className={msg.read ? "text-blue-400" : "text-white/40"} />}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#0f172a] flex items-center gap-2">
        <label className="text-slate-500 hover:text-blue-400 p-2 cursor-pointer transition-colors">
          {uploading ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        </label>
        
        <button 
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={cn(
            "p-2 rounded-xl transition-all",
            recording ? "bg-rose-600 text-white animate-pulse scale-110" : "text-slate-500 hover:text-blue-400"
          )}
        >
          <Mic size={24} />
        </button>

        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder={recording ? "Запись голоса..." : "Ваш ответ..."} 
          disabled={recording}
          className="flex-1 bg-slate-800/50 rounded-3xl px-4 py-3 text-sm focus:outline-none text-white border border-slate-800 focus:border-blue-500/50 transition-all font-medium"
        />
        <button 
          onClick={() => handleSend(input)} 
          className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-600/20 active:scale-90 transition-all"
        >
          <ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
};
