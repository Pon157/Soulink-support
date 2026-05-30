import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Music, ChevronUp, ChevronDown, Shuffle } from 'lucide-react';
import { apiFetch } from '../../lib/api';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

interface Track {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  category: string;
}

export const MusicPlayer = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  // Draggable position
  const [pos, setPos] = useState({ x: 16, y: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredTracks = selectedCategory === 'all' 
    ? tracks 
    : tracks.filter(t => t.category === selectedCategory);
  
  const currentTrack = filteredTracks[currentIndex] || null;

  useEffect(() => {
    const fetchMusic = async () => {
      try {
        const [tracksRes, catsRes] = await Promise.all([
          apiFetch('/api/music'),
          apiFetch('/api/music/categories'),
        ]);
        if (tracksRes.ok) setTracks(await tracksRes.json());
        if (catsRes.ok) setCategories(await catsRes.json());
      } catch (e) {}
    };
    fetchMusic();
  }, []);

  useEffect(() => {
    if (!currentTrack) return;
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.src = currentTrack.audioUrl;
    audio.load();
    if (isPlaying) audio.play().catch(() => {});

    audio.ontimeupdate = () => setProgress(audio.currentTime);
    audio.ondurationchange = () => setDuration(audio.duration || 0);
    audio.onended = () => handleNext();

    return () => {
      audio.ontimeupdate = null;
      audio.ondurationchange = null;
      audio.onended = null;
    };
  }, [currentTrack?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  const handleNext = () => {
    if (filteredTracks.length === 0) return;
    if (shuffle) {
      setCurrentIndex(Math.floor(Math.random() * filteredTracks.length));
    } else {
      setCurrentIndex(i => (i + 1) % filteredTracks.length);
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (filteredTracks.length === 0) return;
    setCurrentIndex(i => (i - 1 + filteredTracks.length) % filteredTracks.length);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setProgress(t);
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Drag logic
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const el = playerRef.current;
      if (!el) return;
      const maxX = window.innerWidth - el.offsetWidth;
      const maxY = window.innerHeight - el.offsetHeight;
      setPos({
        x: Math.max(0, Math.min(maxX, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(maxY, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  if (!isOpen) {
    return (
      <button
        style={{ position: 'fixed', right: 16, bottom: 90, zIndex: 55 }}
        onClick={() => setIsOpen(true)}
        className="w-12 h-12 bg-accent rounded-2xl shadow-lg shadow-accent/30 flex items-center justify-center text-white hover:scale-110 transition-transform"
        title="Музыка"
      >
        <Music size={22} />
        {isPlaying && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-bg-primary animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <div
      ref={playerRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 60, touchAction: 'none' }}
      className="select-none"
    >
      <div
        className={cn(
          "bg-bg-secondary border border-slate-700/60 rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-300",
          isMinimized ? "w-64" : "w-72"
        )}
      >
        {/* Header / drag handle */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-bg-primary/60 cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2">
            <Music size={14} className="text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Плеер</span>
            {isPlaying && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(m => !m)} className="p-1 text-text-dim hover:text-text-main transition-colors">
              {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            <button onClick={() => { setIsOpen(false); setIsPlaying(false); }} className="p-1 text-text-dim hover:text-rose-400 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="p-4 space-y-3">
            {/* Category filter */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => { setSelectedCategory('all'); setCurrentIndex(0); }}
                className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl whitespace-nowrap transition-all", selectedCategory === 'all' ? "bg-accent text-white" : "bg-bg-primary text-text-dim hover:text-text-main")}
              >Все</button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setCurrentIndex(0); }}
                  className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl whitespace-nowrap transition-all", selectedCategory === cat ? "bg-accent text-white" : "bg-bg-primary text-text-dim hover:text-text-main")}
                >{cat}</button>
              ))}
            </div>

            {/* Track list */}
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {filteredTracks.length === 0 && (
                <p className="text-[10px] text-text-dim text-center py-4 italic">Нет треков</p>
              )}
              {filteredTracks.map((track, idx) => (
                <button
                  key={track.id}
                  onClick={() => { setCurrentIndex(idx); setIsPlaying(true); }}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-xl text-left transition-all",
                    idx === currentIndex ? "bg-accent/15 border border-accent/30" : "hover:bg-bg-primary"
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-black", idx === currentIndex ? "bg-accent text-white" : "bg-bg-primary text-text-dim")}>
                    {idx === currentIndex && isPlaying ? '▶' : (idx + 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[11px] font-bold truncate", idx === currentIndex ? "text-text-main" : "text-text-dim")}>{track.title}</p>
                    {track.artist && <p className="text-[9px] text-text-dim truncate">{track.artist}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 pb-4 space-y-2">
          {currentTrack && (
            <div className="text-center">
              <p className="text-xs font-bold text-text-main truncate">{currentTrack.title}</p>
              {currentTrack.artist && <p className="text-[9px] text-text-dim">{currentTrack.artist}</p>}
            </div>
          )}

          {/* Progress */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 1}
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-text-dim font-black">
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setShuffle(s => !s)} className={cn("p-1.5 rounded-lg transition-colors", shuffle ? "text-accent" : "text-text-dim hover:text-text-main")}>
              <Shuffle size={16} />
            </button>
            <button onClick={handlePrev} className="p-2 text-text-dim hover:text-text-main transition-colors">
              <SkipBack size={18} />
            </button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              disabled={!currentTrack}
              className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white shadow-lg shadow-accent/30 hover:scale-105 transition-transform disabled:opacity-40"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button onClick={handleNext} className="p-2 text-text-dim hover:text-text-main transition-colors">
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
