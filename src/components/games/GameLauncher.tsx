import React, { useState, useEffect } from 'react';
import { X, Trophy, MessageSquare, Gamepad2, Swords, Brain, Hash, Edit3, Shield, Video, Timer, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Modal } from '../ui/Modal';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

import { apiFetch } from '../../lib/api';

interface GameLauncherProps {
  gameType: 'chess' | 'checkers' | 'words' | 'seabattle';
  sessionId: string;
  onClose: () => void;
  partnerName: string;
}

export const GameLauncher = ({ gameType, sessionId, onClose, partnerName }: GameLauncherProps) => {
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<any>(null);

  useEffect(() => {
    const fetchGame = async () => {
        try {
            const res = await apiFetch(`/api/games/${sessionId}`);
            const data = await res.json();
            setGameState(data);
            setLoading(false);
        } catch (e) { console.error(e); }
    };
    fetchGame();
    const interval = setInterval(fetchGame, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const renderGame = () => {
    if (loading || !gameState) return (
        <div className="flex flex-col items-center gap-4 animate-pulse">
            <RefreshCw className="animate-spin text-accent" size={48} />
            <p className="text-[10px] font-black uppercase tracking-widest text-text-dim text-center px-8 text-white/50">Подключение к игровой сессии...</p>
        </div>
    );

    switch (gameType) {
      case 'chess': return <ChessGame sessionId={sessionId} partnerName={partnerName} state={gameState.state} />;
      case 'words': return <WordsGame sessionId={sessionId} partnerName={partnerName} state={gameState.state} />;
      case 'checkers': return <CheckersGame sessionId={sessionId} partnerName={partnerName} state={gameState.state} />;
      case 'seabattle': return <SeaBattleGame sessionId={sessionId} partnerName={partnerName} state={gameState.state} />;
      default: return (
        <div className="text-center space-y-6 max-w-xs transition-all animate-in fade-in zoom-in duration-500 px-8">
            <div className="w-24 h-24 bg-accent/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-accent/10">
                <Timer className="text-accent animate-bounce" size={40} />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">В разработке</h3>
                <p className="text-[10px] text-text-dim uppercase font-black tracking-widest leading-relaxed">Разработчики SoulLink трудятся над {gameType === 'seabattle' ? 'Морским Боем' : 'этой игрой'}. Скоро здесь будет жарко!</p>
            </div>
            <button onClick={onClose} className="w-full py-4 bg-bg-primary border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-accent transition-all">Закрыть</button>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-3xl flex flex-col p-4 md:p-8 animate-in fade-in duration-300">
      <header className="flex items-center justify-between mb-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-accent rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-accent/40 relative">
            <div className="absolute inset-0 bg-white/20 rounded-[2rem] animate-pulse" />
            <Gamepad2 className="relative" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
              {gameType === 'chess' ? 'Шахматный Мастер' : gameType === 'words' ? 'Битва Слов' : gameType === 'checkers' ? 'Ударные Шашки' : 'SoulБитва'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <p className="text-[11px] font-black text-accent uppercase tracking-widest">В ЭФИРЕ • ПРОТИВ {partnerName}</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-4 bg-white/5 rounded-[1.5rem] text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-90"><X size={28} /></button>
      </header>

      <div className="flex-1 bg-bg-secondary/50 rounded-[4rem] border border-white/5 shadow-2xl overflow-hidden relative flex flex-col items-center justify-center max-w-4xl mx-auto w-full backdrop-blur-md">
         {renderGame()}
      </div>
    </div>
  );
};

const ChessGame = ({ sessionId, partnerName, state }: { sessionId: string, partnerName: string, state: any }) => {
    const pieces = {
        black: ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        white: ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    };

    return (
        <div className="w-full max-w-md aspect-square bg-slate-900 rounded-[3rem] overflow-hidden border-8 border-slate-800 shadow-2xl relative transition-all animate-in zoom-in duration-500">
            <div className="grid grid-cols-8 grid-rows-8 h-full gap-0.5 p-0.5 bg-slate-800">
                {Array.from({ length: 64 }).map((_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isWhiteSquare = (row + col) % 2 === 0;
                    
                    let piece = null;
                    if (row === 0) piece = pieces.black[col];
                    if (row === 1) piece = '♟';
                    if (row === 6) piece = '♙';
                    if (row === 7) piece = pieces.white[col];

                    return (
                        <div key={i} className={cn(
                            "flex items-center justify-center text-4xl select-none transition-colors",
                            isWhiteSquare ? 'bg-slate-200/90' : 'bg-slate-600'
                        )}>
                             {piece && <span className={cn(
                                 "drop-shadow-md",
                                 row < 2 ? "text-slate-900" : "text-amber-500"
                             )}>{piece}</span>}
                        </div>
                    );
                })}
            </div>
            <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none">
                <div className="bg-bg-primary/90 backdrop-blur-md p-6 rounded-[2.5rem] border border-accent/30 text-center space-y-2 shadow-2xl max-w-xs transform -rotate-1 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                            <Brain className="text-accent animate-pulse" size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-black italic uppercase tracking-tighter text-white">Ход {partnerName}...</p>
                            <p className="text-[8px] text-text-dim uppercase font-black tracking-widest leading-none">Соперник обдумывает ход</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CheckersGame = ({ partnerName }: { partnerName: string }) => {
    return (
        <div className="w-full max-w-md aspect-square bg-slate-900 rounded-[3rem] overflow-hidden border-8 border-slate-800 shadow-2xl relative animate-in zoom-in duration-500">
            <div className="grid grid-cols-8 grid-rows-8 h-full bg-slate-800">
                {Array.from({ length: 64 }).map((_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isWhite = (row + col) % 2 === 0;
                    return (
                        <div key={i} className={cn(
                            "flex items-center justify-center select-none",
                            isWhite ? 'bg-slate-300' : 'bg-slate-700'
                        )}>
                             {!isWhite && row < 3 && <div className="w-8 h-8 rounded-full bg-slate-100 shadow-lg border-2 border-slate-400" />}
                             {!isWhite && row > 4 && <div className="w-8 h-8 rounded-full bg-rose-500 shadow-lg border-2 border-rose-800" />}
                        </div>
                    );
                })}
            </div>
                    <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none">
                        <div className="bg-bg-primary/90 backdrop-blur-md p-6 rounded-[2.5rem] border border-indigo-500/20 text-center space-y-2 translate-y-0 shadow-2xl pointer-events-auto">
                            <p className="text-xs font-black uppercase text-indigo-400">Твой ход</p>
                            <p className="text-[8px] text-text-dim uppercase font-black tracking-widest leading-none">Обдумайте следующую атаку</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const WordsGame = ({ sessionId, partnerName, state }: { sessionId: string, partnerName: string, state: any }) => {
    const [words, setWords] = useState<string[]>(state?.words || []);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    
    // Check if it's current user's turn
    // Since we don't have currentUserId directly here easily, we infer from previous turns
    // The server should ideally pass the current userId, but we can manage locally
    const lastWord = words[words.length - 1];
    const isMyTurn = state?.turn !== partnerName; // Simple logic: if turn is not partner, it's me

    useEffect(() => {
        if (state?.words) {
            setWords(state.words);
            const lastW = state.words[state.words.length - 1];
            if (lastW) {
                const lastChar = lastW.charAt(lastW.length - 1).toUpperCase();
                // Avoid pre-filling if it's already filled or if it's not my turn
                if (!input.startsWith(lastChar)) {
                    setInput(lastChar);
                }
            }
        }
    }, [state?.words]);

    const handleSendWord = async () => {
        if (!input || sending || !isMyTurn) return;
        
        // Basic validation: must start with last letter of previous word
        if (lastWord) {
            const lastChar = lastWord.charAt(lastWord.length - 1).toUpperCase();
            if (input.charAt(0).toUpperCase() !== lastChar) {
                // UI feedback could go here
                return;
            }
        }

        setSending(true);
        try {
            const nextWords = [...words, input.toUpperCase()];
            await apiFetch(`/api/games/${sessionId}/move`, {
                method: 'POST',
                body: JSON.stringify({ 
                    state: { 
                        ...state, 
                        words: nextWords,
                        turn: partnerName // pass turn to partner
                    } 
                })
            });
            setInput('');
        } catch (e) { console.error(e); } finally { setSending(false); }
    };

    return (
        <div className="w-full max-w-md h-full flex flex-col p-8 space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex-1 space-y-4 overflow-y-auto pr-4 scroll-smooth">
                {words.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                        <Edit3 size={48} className="text-accent" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Напишите первое слово, чтобы начать игру!</p>
                    </div>
                )}
                {words.map((w, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: i % 2 === 1 ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i} 
                        className={cn(
                            "p-5 rounded-[2.5rem] shadow-xl border relative",
                            i % 2 === 1 ? "bg-accent text-white border-white/10 ml-12" : "bg-bg-primary text-text-main border-slate-800 mr-12"
                        )}
                    >
                        <p className="font-black italic text-xl tracking-tighter leading-none">{w}</p>
                        <div className={cn("absolute -bottom-2 text-[8px] font-black uppercase tracking-widest opacity-40 px-3", i % 2 === 1 ? "right-4" : "left-4 text-white")}>
                             {i % 2 === 1 ? 'Вы' : partnerName}
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="flex gap-4 items-center bg-bg-primary/50 p-4 rounded-[2.5rem] border border-slate-800 shadow-2xl backdrop-blur-xl relative">
                {!isMyTurn && (
                    <div className="absolute inset-0 bg-bg-secondary/80 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center z-10 transition-all">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="animate-spin text-accent" size={16} />
                            <p className="text-[9px] font-black uppercase tracking-widest text-white italic">Ожидание хода {partnerName}...</p>
                        </div>
                    </div>
                )}
                <input 
                    value={input} 
                    onChange={e => setInput(e.target.value.toUpperCase())} 
                    onKeyDown={e => e.key === 'Enter' && handleSendWord()}
                    placeholder={isMyTurn ? "Введите слово..." : ""} 
                    disabled={sending || !isMyTurn}
                    className="flex-1 bg-transparent p-2 outline-none text-lg font-black italic uppercase text-text-main tracking-tighter"
                />
                <button 
                    onClick={handleSendWord}
                    disabled={sending || !isMyTurn || !input}
                    className="bg-accent w-14 h-14 rounded-2xl text-white shadow-xl shadow-accent/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    {sending ? <RefreshCw className="animate-spin" size={24} /> : <ArrowRight size={28} />}
                </button>
            </div>
        </div>
    );
};

const SeaBattleGame = ({ sessionId, partnerName, state }: any) => {
    const [ships, setShips] = useState<number[]>(state?.ships || []);
    const [hits, setHits] = useState<number[]>(state?.hits || []);

    const toggleShip = async (index: number) => {
        let newShips = [...ships];
        if (newShips.includes(index)) {
            newShips = newShips.filter(s => s !== index);
        } else {
            if (newShips.length >= 20) return; // Limit 20 cells for ships
            newShips.push(index);
        }
        setShips(newShips);
        try {
            await apiFetch(`/api/games/${sessionId}/move`, {
                method: 'POST',
                body: JSON.stringify({ state: { ...state, ships: newShips } })
            });
        } catch (e) { console.error(e); }
    };

    return (
        <div className="w-full max-w-md h-full flex flex-col p-8 space-y-6 animate-in zoom-in duration-500">
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-center text-white">Морской Бой LIVE</h3>
            <div className="grid grid-cols-2 gap-6 flex-1">
                <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase text-center text-emerald-400 tracking-widest">Твой флот ({ships.length}/20)</p>
                    <div className="grid grid-cols-10 grid-rows-10 gap-px bg-slate-800 border-2 border-slate-700 aspect-square rounded-xl overflow-hidden shadow-2xl">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div 
                                key={i} 
                                onClick={() => toggleShip(i)}
                                className={cn(
                                    "bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer",
                                    ships.includes(i) ? "bg-emerald-500/40" : ""
                                )} 
                            />
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase text-center text-rose-500 tracking-widest">Флот противника</p>
                    <div className="grid grid-cols-10 grid-rows-10 gap-px bg-slate-800 border-2 border-slate-700 aspect-square rounded-xl overflow-hidden shadow-2xl">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="bg-slate-900 group relative cursor-crosshair">
                                <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-20 transition-opacity" />
                                {hits.includes(i) && <div className="absolute inset-0 flex items-center justify-center text-rose-500 font-bold text-xs">X</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="bg-bg-primary/50 backdrop-blur-xl p-4 rounded-3xl border border-accent/20 text-center">
                 <p className="text-[10px] font-black uppercase text-white tracking-widest">
                     {ships.length < 20 ? 'Расставьте корабли (нажимайте на клетки)' : `Ожидание готовности ${partnerName}...`}
                 </p>
            </div>
        </div>
    );
};

export const ArrowRight = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);
