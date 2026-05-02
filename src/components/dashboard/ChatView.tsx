import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Star, Mic, Camera, ArrowRight, CheckCheck, Loader2, Play, Pause, X, Video, Shield, Image as ImageIcon, Gamepad2, Hash } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { uploadFile } from '../../lib/services';
import { Modal } from '../ui/Modal';
import { UserAvatar } from '../ui/UserAvatar';
import { GameLauncher } from '../games/GameLauncher';
import { Trash, Edit3, Reply, MoreVertical } from 'lucide-react';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const VoiceMessage = ({ url, isOwn }: { url: string, isOwn: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
        if (audioRef.current.duration === Infinity) {
            // Dirty fix for Infinity duration in some browsers for webm blobs
            audioRef.current.currentTime = 1e101;
            const checkDuration = () => {
                if (audioRef.current) {
                    setDuration(audioRef.current.duration);
                    audioRef.current.currentTime = 0;
                    audioRef.current.removeEventListener('timeupdate', checkDuration);
                }
            };
            audioRef.current.addEventListener('timeupdate', checkDuration);
        } else {
            setDuration(audioRef.current.duration);
        }
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-2xl min-w-[180px]",
      isOwn ? "bg-white/10" : "bg-accent/5 border border-accent/10"
    )}>
      <button 
        onClick={togglePlay}
        className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg",
            isOwn ? "bg-white text-slate-900" : "bg-accent text-white"
        )}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>
      
      <div className="flex-1 space-y-1">
        <div className="h-1 bg-current opacity-20 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-current"
            animate={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : '...'}</span>
        </div>
      </div>

      <audio 
        ref={audioRef} 
        src={url} 
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        className="hidden" 
        preload="metadata"
      />
    </div>
  );
};

export const ChatView = ({ chatId, onBack, onImageClick, currentUser, wallpaper }: { chatId: string, onBack: () => void, onImageClick: (url: string) => void, currentUser: any, wallpaper?: string }) => {
  const userRole = currentUser.role;
  const currentUserId = currentUser.id;
  const [messages, setMessages] = useState<any[]>([]);
  const [partner, setPartner] = useState<any>(null);
  const [input, setInput] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [activeGame, setActiveGame] = useState<any>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [errorModal, setErrorModal] = useState<string|null>(null);
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [showMsgActions, setShowMsgActions] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatId === 'SYSTEM') {
      setPartner({
        nickname: 'Техподдержка Команды',
        role: 'OWNER',
        avatar: null,
        isSystem: true
      });
      setLoading(false);
    } else {
      const fetchPartner = async () => {
        try {
          const res = await apiFetch(`/api/users/profile/${chatId}`);
          if (res.ok) setPartner(await res.json());
        } catch (e) {
          console.error(e);
        }
      };
      fetchPartner();
    }

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
    
    if (editingMessage) {
        try {
            await apiFetch(`/api/messages/${editingMessage.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ content })
            });
            setEditingMessage(null);
            setInput('');
            const res = await apiFetch(`/api/messages/${chatId}`);
            setMessages(await res.json());
        } catch (e) { console.error(e); }
        return;
    }

    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: chatId, content, mediaUrl, mediaType, replyToId: replyTo?.id }),
      });
      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
      setInput('');
      setReplyTo(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessage = async (id: string) => {
      try {
          await apiFetch(`/api/messages/${id}`, { method: 'DELETE' });
          const res = await apiFetch(`/api/messages/${chatId}`);
          setMessages(await res.json());
          setShowMsgActions(null);
      } catch (e) { console.error(e); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setErrorModal('Файл слишком большой. Лимит 50МБ.');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file);
      let type: string = 'file';
      if (file.type.startsWith('image/')) type = 'photo';
      if (file.type.startsWith('video/')) type = 'video';
      await handleSend('', url, type);
    } catch (error) {
      setErrorModal('Ошибка при загрузке.');
    } finally {
      setUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
        mediaRecorder?.stop();
    } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Improved recorder setup
          let mimeType = 'audio/webm;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/ogg;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';
          
          const recorder = new MediaRecorder(stream, { mimeType });
          const chunks: Blob[] = [];
          
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          
          recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: mimeType });
            stream.getTracks().forEach(track => track.stop());
            setRecording(false);
            setMediaRecorder(null);

            if (blob.size < 1000) return; // 1KB minimum
            
            const file = new File([blob], `voice.${mimeType.split('/')[1].split(';')[0]}`, { type: mimeType });
            setUploading(true);
            try {
              const url = await uploadFile(file);
              await handleSend('', url, 'voice');
            } catch (e) {
                console.error(e);
                setErrorModal('Ошибка отправки голосового');
            } finally {
              setUploading(false);
            }
          };

          recorder.start(100); // Sample every 100ms
          setMediaRecorder(recorder);
          setRecording(true);
        } catch (e) {
          setErrorModal('Микрофон недоступен');
        }
    }
  };

  const handleRatingSubmit = async () => {
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ adminId: chatId, rating, comment, mediaUrl: reviewPhoto }),
      });
      setShowRating(false);
      setComment('');
      setReviewPhoto(null);
    } catch (e) {
      setErrorModal('Не удалось отправить отзыв');
    }
  };

  const handleReviewPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setReviewPhoto(url);
    } catch (e) {
      setErrorModal('Ошибка загрузки фото');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateTicket = async () => {
      if (!ticketSubject || !ticketMessage) return;
      try {
          await apiFetch('/api/tickets', {
              method: 'POST',
              body: JSON.stringify({ subject: ticketSubject, message: ticketMessage })
          });
          setShowTicketModal(false);
          setTicketSubject('');
          setTicketMessage('');
          const res = await apiFetch(`/api/messages/${chatId}`);
          setMessages(await res.json());
      } catch (e) {
          setErrorModal('Ошибка создания тикета');
      }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary relative overflow-hidden">
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
                 <UserAvatar user={partner} size={96} className="relative border-2 border-slate-800" />
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
          <div className="flex items-center gap-4">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-800 border border-slate-700 rounded-2xl cursor-pointer hover:border-accent transition-all">
                  <ImageIcon size={18} className={reviewPhoto ? "text-accent" : "text-text-dim"} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{reviewPhoto ? 'Заменено' : 'Прикрепить фото'}</span>
                  <input type="file" hidden accept="image/*" onChange={handleReviewPhoto} />
              </label>
              {reviewPhoto && (
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-accent">
                      <img src={reviewPhoto} className="w-full h-full object-cover" />
                  </div>
              )}
          </div>
          <button
            onClick={handleRatingSubmit}
            disabled={rating === 0 || uploading}
            className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Отправить отзыв'}
          </button>
        </div>
      </Modal>

      <header className="p-4 flex items-center justify-between border-b border-slate-800/50 bg-bg-primary/95 backdrop-blur-md">
        <div className={cn("flex items-center", (chatId !== 'SYSTEM' && !chatId.startsWith('TICKET_')) ? "cursor-pointer" : "")} onClick={() => (chatId !== 'SYSTEM' && !chatId.startsWith('TICKET_')) && setShowProfile(true)}>
          <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="p-2 -ml-2 text-text-dim hover:text-text-main transition-colors"><ChevronRight size={28} className="rotate-180" /></button>
          <div className="ml-2">
            <h3 className="font-black text-text-main tracking-tight leading-none text-base italic">
                {chatId === 'SYSTEM' ? 'SoulLink Уведомления' : (chatId.startsWith('TICKET_') ? 'Техподдержка' : (partner?.nickname || 'Загрузка...'))}
            </h3>
            {chatId === 'SYSTEM' || chatId.startsWith('TICKET_') ? (
                <div className={cn("flex items-center gap-1.5 mt-1.5", chatId === 'SYSTEM' ? "text-blue-400" : "text-emerald-400")}>
                    <Shield size={10} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{chatId === 'SYSTEM' ? 'администратор' : 'служба поддержки'}</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 mt-1.5">
                    {partner?.isOnRest ? (
                        <>
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest italic">На отдыхе</span>
                        </>
                    ) : (
                        partner?.lastSeen && (Date.now() - new Date(partner.lastSeen).getTime() < 120000) ? (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">в сети</span>
                            </>
                        ) : (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                <span className="text-[9px] text-text-dim font-black uppercase tracking-widest">был {partner?.lastSeen ? new Date(partner.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'давно'}</span>
                            </>
                        )
                    )}
                </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chatId !== 'SYSTEM' && !chatId.startsWith('TICKET_') && (
              <button 
                onClick={() => setShowGameMenu(true)} 
                className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl hover:bg-indigo-500/20 transition-all focus:scale-110 active:scale-95 shadow-lg shadow-indigo-500/10"
                title="Игры"
              >
                  <Gamepad2 size={20} />
              </button>
          )}
          {chatId === 'SYSTEM' && <button onClick={() => setShowTicketModal(true)} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500/20 transition-all font-black text-[10px] uppercase tracking-widest px-4 shadow-lg shadow-emerald-500/10 active:scale-95">Тикет</button>}
          {userRole === 'USER' && !chatId.startsWith('TICKET_') && chatId !== 'SYSTEM' && (
            <button onClick={() => setShowRating(true)} className="p-3 bg-accent/10 text-accent rounded-2xl hover:bg-accent/20 transition-all shadow-lg shadow-accent/10 active:scale-95">
                <Star size={20} />
            </button>
          )}
        </div>
      </header>

      <Modal isOpen={showTicketModal} onClose={() => setShowTicketModal(false)} title="Создать обращение">
          <div className="space-y-4">
              <p className="text-xs text-text-dim italic text-center">Опишите вашу проблему, и технический специалист SoulLink поможет вам в ближайшее время.</p>
              <div className="bg-bg-primary p-6 rounded-[2.5rem] border border-slate-800 space-y-4">
                  <input 
                    value={ticketSubject}
                    onChange={e => setTicketSubject(e.target.value)}
                    placeholder="Тема обращения..."
                    className="w-full bg-transparent outline-none text-text-main text-sm font-black italic border-b border-slate-800 pb-2 focus:border-accent transition-all"
                  />
                  <textarea 
                    value={ticketMessage}
                    onChange={e => setTicketMessage(e.target.value)}
                    placeholder="Подробности..."
                    className="w-full bg-transparent outline-none text-text-main text-sm font-black italic min-h-[150px] resize-none"
                  />
              </div>
              <button 
                onClick={handleCreateTicket}
                className="w-full bg-accent text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-accent/20 active:scale-95 transition-all"
              >
                Отправить запрос
              </button>
          </div>
      </Modal>

      <Modal isOpen={showGameMenu} onClose={() => setShowGameMenu(false)} title="Игровой центр">
          <div className="grid grid-cols-2 gap-4">
              {[
                  { id: 'chess', label: 'Шахматы', icon: <Hash size={24} />, color: 'bg-amber-500' },
                  { id: 'words', label: 'Слова', icon: <Edit3 size={24} />, color: 'bg-emerald-500' },
                  { id: 'checkers', label: 'Шашки', icon: <Shield size={24} />, color: 'bg-indigo-500' },
                  { id: 'seabattle', label: 'Морской бой', icon: <Video size={24} />, color: 'bg-rose-500' }
              ].map(game => (
                  <button 
                    key={game.id}
                    onClick={async () => { 
                        try {
                            const res = await apiFetch('/api/games/create', {
                                method: 'POST',
                                body: JSON.stringify({ type: game.id, partnerId: chatId })
                            });
                            const session = await res.json();
                            setActiveGame({ type: game.id, sessionId: session.id });
                            setShowGameMenu(false);
                        } catch (e) {
                            setErrorModal('Не удалось создать игру');
                        }
                    }}
                    className="p-8 bg-bg-primary border border-slate-800 rounded-[3rem] hover:border-accent transition-all flex flex-col items-center gap-4 group"
                  >
                      <div className={cn("w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110", game.color)}>
                          {game.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{game.label}</span>
                  </button>
              ))}
          </div>
      </Modal>

      {activeGame && (
          <GameLauncher 
            gameType={activeGame.type} 
            sessionId={activeGame.sessionId}
            partnerName={partner?.nickname || 'Админ'} 
            currentUserId={currentUserId}
            onClose={() => setActiveGame(null)} 
          />
      )}

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={wallpaper ? {
          backgroundImage: `linear-gradient(rgba(var(--bg-primary-rgb), 0.9), rgba(var(--bg-primary-rgb), 0.95)), url(${wallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        } : {}}
      >
        {messages.map((msg) => {
          const isOwn = msg.senderId !== chatId;
          const repliedToMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              onClick={() => setShowMsgActions(showMsgActions === msg.id ? null : msg.id)}
              className={cn(
                "max-w-[85%] p-3.5 rounded-3xl relative group cursor-pointer transition-all",
                isOwn ? "bg-accent text-white ml-auto" : "bg-bg-primary text-text-main border border-slate-800/50 mr-auto",
                showMsgActions === msg.id ? "ring-2 ring-blue-500/50" : ""
              )}
            >
              {showMsgActions === msg.id && (
                  <div className={cn(
                      "absolute -top-12 bg-bg-primary border border-slate-800 p-1 rounded-2xl flex gap-1 z-20 shadow-2xl",
                      isOwn ? "right-0" : "left-0"
                  )}>
                      <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); setShowMsgActions(null); }} className="p-2 hover:bg-slate-800 rounded-xl text-text-main"><Reply size={16} /></button>
                      {isOwn && !msg.isDeleted && <button onClick={(e) => { e.stopPropagation(); setEditingMessage(msg); setInput(msg.content); setShowMsgActions(null); }} className="p-2 hover:bg-slate-800 rounded-xl text-text-main"><Edit3 size={16} /></button>}
                      {(isOwn || ['ADMIN', 'CURATOR', 'OWNER'].includes(userRole)) && <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="p-2 hover:bg-slate-800 rounded-xl text-rose-500"><Trash size={16} /></button>}
                  </div>
              )}

              {repliedToMsg && (
                  <div className="bg-black/10 p-2 rounded-xl mb-2 border-l-2 border-current/30 text-[10px] italic line-clamp-1 opacity-70">
                      {repliedToMsg.content || 'Медиа'}
                  </div>
              )}

      {/* Game Invite Rendering in messages loop */}
      {msg.mediaType === 'game_invite' ? (
        <div className={cn(
            "p-6 rounded-[2.5rem] border-2 space-y-4 text-center",
            isOwn ? "bg-white/10 border-white/20" : "bg-bg-secondary border-accent/20"
        )}>
            <div className="w-16 h-16 bg-accent rounded-[1.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-accent/40">
                <Gamepad2 size={32} className="text-white" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-black italic uppercase italic tracking-tighter">
                    {msg.mediaUrl === 'chess' ? 'Шахматная партия' : msg.mediaUrl === 'words' ? 'Битва в слова' : 'Игровая дуэль'}
                </p>
                <p className="text-[10px] uppercase font-black tracking-widest opacity-60">
                    {isOwn ? 'Вы отправили вызов' : 'Вас вызывают на бой!'}
                </p>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); setActiveGame({ type: msg.mediaUrl, sessionId: msg.content }); }}
                className={cn(
                    "w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                    isOwn ? "bg-white text-slate-900" : "bg-accent text-white"
                )}
            >
                {isOwn ? 'Наблюдать' : 'Принять вызов'}
            </button>
        </div>
      ) : msg.mediaType === 'voice' ? (
        <VoiceMessage url={msg.mediaUrl!} isOwn={isOwn} />
      ) : msg.mediaType === 'photo' ? (
                <img src={msg.mediaUrl} className="rounded-2xl w-full cursor-zoom-in shadow-lg" onClick={(e) => { e.stopPropagation(); onImageClick(msg.mediaUrl); }} />
              ) : msg.mediaType === 'video' ? (
                <video src={msg.mediaUrl} controls className="rounded-2xl w-full shadow-lg max-h-[300px]" />
              ) : (
                <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
              )}
              
              <div className="flex items-center justify-end gap-1.5 mt-1 opacity-60 px-1">
                {msg.isEdited && <span className="text-[8px] uppercase font-bold">ред.</span>}
                <span className="text-[9px] uppercase font-black tracking-widest">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {isOwn && <CheckCheck size={14} className={msg.read ? "text-blue-200" : "text-white/40"} />}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {(chatId !== 'SYSTEM' || (['ADMIN', 'CURATOR', 'OWNER'].includes(userRole))) && (
        <div className="p-4 bg-bg-primary border-t border-slate-800/50 space-y-3">
          {replyTo && (
              <div className="flex items-center justify-between bg-bg-secondary p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 overflow-hidden">
                      <Reply size={14} className="text-accent" />
                      <div className="text-[10px] text-text-dim truncate italic max-w-[200px]">
                          {replyTo.content || 'Медиа'}
                      </div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-text-dim p-1"><X size={14} /></button>
              </div>
          )}
          {editingMessage && (
              <div className="flex items-center justify-between bg-bg-secondary p-3 rounded-2xl border border-accent/30">
                  <div className="flex items-center gap-2">
                      <Edit3 size={14} className="text-accent" />
                      <span className="text-[10px] text-accent font-black uppercase tracking-widest">Редактирование</span>
                  </div>
                  <button onClick={() => { setEditingMessage(null); setInput(''); }} className="text-text-dim p-1"><X size={14} /></button>
              </div>
          )}
          <div className="flex items-center gap-2">
              <label className="text-text-dim hover:text-accent p-2 cursor-pointer transition-colors">
              {uploading ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
              <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} disabled={uploading} />
              </label>
              
              {!chatId.startsWith('TICKET_') && !['ADMIN', 'CURATOR', 'OWNER'].includes(userRole) && (
                  <button 
                  onClick={toggleRecording}
                  className={cn(
                      "p-2 rounded-xl transition-all",
                      recording ? "bg-rose-600 text-white animate-pulse scale-110" : "text-text-dim hover:text-accent"
                  )}
                  >
                  <Mic size={24} />
                  </button>
              )}
  
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
      )}
    </div>
  );
};
