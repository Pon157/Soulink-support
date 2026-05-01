import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Star, Mic, Camera, ArrowRight, CheckCheck, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { uploadFile } from '../../lib/services';
import { Modal } from '../ui/Modal';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const VoiceMessage = ({ url, isOwn }: { url: string, isOwn: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className={cn("flex items-center gap-3 p-1 min-w-[200px]", isOwn ? "text-white" : "text-text-main")}>
      <button 
        onClick={togglePlay}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
          isOwn ? "bg-white/20 hover:bg-white/30" : "bg-accent/10 hover:bg-accent/20 text-accent"
        )}
      >
        {playing ? <X size={18} /> : <div className="ml-0.5"><ArrowRight size={18} /></div>}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 bg-current opacity-20 rounded-full overflow-hidden">
           <motion.div 
            initial={{ width: 0 }}
            animate={{ width: playing ? '100%' : '0%' }}
            transition={{ duration: 10, ease: 'linear' }}
            className="h-full bg-current" 
           />
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Голосовое сообщение</p>
      </div>
      <audio 
        ref={audioRef} 
        src={url} 
        onEnded={() => setPlaying(false)} 
        className="hidden" 
        controlsList="nodownload"
      />
    </div>
  );
};

export const ChatView = ({ chatId, onBack, onImageClick, userRole, userBanner }: { chatId: string, onBack: () => void, onImageClick: (url: string) => void, userRole: string, userBanner?: string }) => {
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
      // Fixing the audio blob issue by using a more standard mime type and options
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        
        // Clean up immediately
        setRecording(false);
        setMediaRecorder(null);
        stream.getTracks().forEach(track => track.stop());

        if (blob.size < 1000) return; // Prevent empty/too short recordings
        
        const file = new File([blob], 'voice.webm', { type: 'audio/webm;codecs=opus' });
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
    <div className="flex flex-col h-full bg-bg-secondary">
      <Modal isOpen={!!errorModal} onClose={() => setErrorModal(null)} title="Внимание">
        <div className="text-center space-y-6">
          <p className="text-rose-400 font-bold italic">{errorModal}</p>
          <button onClick={() => setErrorModal(null)} className="w-full bg-bg-primary py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Понятно</button>
        </div>
      </Modal>

      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Профиль собеседника">
        {partner ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                 <div className="absolute inset-0 bg-accent blur-xl opacity-20" />
                 <img src={partner.avatar || `https://i.pravatar.cc/150?u=${partner.id}`} className="relative w-24 h-24 rounded-3xl object-cover border-2 border-slate-800" />
              </div>
              <h4 className="text-xl font-black text-text-main italic">{partner.nickname}</h4>
              <p className="text-accent text-[10px] font-black uppercase tracking-widest mt-1">{partner.role}</p>
            </div>
            {partner.banner && (
              <div className="h-24 w-full rounded-2xl overflow-hidden border border-slate-800">
                <img src={partner.banner} className="w-full h-full object-cover" />
              </div>
            )}
            {partner.description && (
              <div className="bg-bg-primary p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-text-dim italic">"{partner.description}"</p>
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

      <header className="p-4 flex items-center justify-between border-b border-slate-800/50 bg-bg-primary/95 backdrop-blur-md">
        <div className="flex items-center cursor-pointer" onClick={() => setShowProfile(true)}>
          <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="p-2 -ml-2 text-text-dim hover:text-text-main transition-colors"><ChevronRight size={28} className="rotate-180" /></button>
          <div className="ml-2">
            <h3 className="font-black text-text-main tracking-tight leading-none text-base italic">{partner?.nickname || 'Загрузка...'}</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
               <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">в сети</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userRole === 'USER' && <button onClick={() => setShowRating(true)} className="p-3 bg-accent/10 text-accent rounded-2xl hover:bg-accent/20 transition-all"><Star size={20} /></button>}
        </div>
      </header>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={partner?.banner || userBanner ? {
          backgroundImage: `linear-gradient(rgba(var(--bg-primary-rgb), 0.9), rgba(var(--bg-primary-rgb), 0.95)), url(${partner?.banner || userBanner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        } : {}}
      >
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={cn(
              "max-w-[85%] p-3.5 rounded-3xl relative",
              msg.senderId !== chatId ? "bg-accent text-white ml-auto" : "bg-bg-primary text-text-main border border-slate-800/50 mr-auto"
            )}
          >
        {msg.mediaType === 'voice' ? (
              <VoiceMessage url={msg.mediaUrl!} isOwn={msg.senderId !== chatId} />
            ) : msg.mediaType === 'photo' ? (
              <img src={msg.mediaUrl} className="rounded-2xl w-full cursor-zoom-in shadow-lg" onClick={() => onImageClick(msg.mediaUrl)} />
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

      <div className="p-4 bg-bg-primary flex items-center gap-2 border-t border-slate-800/50">
        <label className="text-text-dim hover:text-accent p-2 cursor-pointer transition-colors">
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
            recording ? "bg-rose-600 text-white animate-pulse scale-110" : "text-text-dim hover:text-accent"
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
          className="flex-1 bg-bg-secondary rounded-3xl px-4 py-3 text-sm focus:outline-none text-text-main border border-slate-800 focus:border-accent/50 transition-all font-medium italic"
        />
        <button 
          onClick={() => handleSend(input)} 
          className="bg-accent p-3 rounded-2xl text-white shadow-lg shadow-accent/20 active:scale-90 transition-all"
        >
          <ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
};
