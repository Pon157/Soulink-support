import React, { useState } from 'react';
import { X, Trophy, MessageSquare, Gamepad2, Swords, Brain, Hash } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface GameLauncherProps {
  gameType: 'chess' | 'checkers' | 'words' | 'seabattle';
  onClose: () => void;
  partnerName: string;
}

export const GameLauncher = ({ gameType, onClose, partnerName }: GameLauncherProps) => {
  const [gameState, setGameState] = useState<any>(null);

  const renderGame = () => {
    switch (gameType) {
      case 'chess': return <ChessGame partnerName={partnerName} />;
      case 'words': return <WordsGame partnerName={partnerName} />;
      default: return <div className="text-center py-20 text-text-dim italic">Игра "{gameType}" в разработке...</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex flex-col p-4 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white shadow-xl shadow-accent/20">
            <Gamepad2 size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">
              {gameType === 'chess' ? 'Шахматы' : gameType === 'words' ? 'Игра в слова' : 'Битва'}
            </h2>
            <p className="text-[10px] font-black text-accent uppercase tracking-widest">Против: {partnerName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-4 bg-white/5 rounded-2xl text-white/50 hover:text-white transition-all"><X size={24} /></button>
      </header>

      <div className="flex-1 bg-bg-secondary rounded-[3rem] border border-slate-800/50 shadow-2xl overflow-hidden relative flex flex-col items-center justify-center">
         {renderGame()}
      </div>
    </div>
  );
};

const ChessGame = ({ partnerName }: { partnerName: string }) => {
    return (
        <div className="w-full max-w-sm aspect-square bg-slate-800 rounded-2xl overflow-hidden border-4 border-slate-700 shadow-2xl relative">
            {/* Simple Chess Board Mockup for now */}
            <div className="grid grid-cols-8 grid-rows-8 h-full">
                {Array.from({ length: 64 }).map((_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isWhite = (row + col) % 2 === 0;
                    return (
                        <div key={i} className={isWhite ? 'bg-slate-200/90' : 'bg-slate-600'}>
                             {/* Mock figures */}
                             {row === 1 && <div className="h-full flex items-center justify-center text-slate-400">♟</div>}
                             {row === 6 && <div className="h-full flex items-center justify-center text-amber-600">♙</div>}
                        </div>
                    );
                })}
            </div>
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                <div className="bg-bg-primary p-6 rounded-3xl border border-accent/20 text-center space-y-4">
                    <Brain className="mx-auto text-accent" size={32} />
                    <p className="text-sm font-black italic uppercase">Ход {partnerName}...</p>
                    <p className="text-[9px] text-text-dim uppercase font-black tracking-widest">Ожидание хода противника</p>
                </div>
            </div>
        </div>
    );
};

const WordsGame = ({ partnerName }: { partnerName: string }) => {
    const [words, setWords] = useState<string[]>(['АПЕЛЬСИН', 'НИТКА', 'АРБУЗ', 'ЗАБОР']);
    const [input, setInput] = useState('');

    return (
        <div className="w-full max-w-md h-full flex flex-col p-8 space-y-6">
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                {words.map((w, i) => (
                    <div key={i} className={i % 2 === 0 ? "bg-accent/10 border border-accent/20 p-4 rounded-2xl ml-auto" : "bg-bg-primary p-4 rounded-2xl mr-auto"}>
                        <p className="font-black italic text-lg tracking-tighter">{w}</p>
                        <p className="text-[8px] font-bold uppercase opacity-40">{i % 2 === 0 ? 'Вы' : partnerName}</p>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Ваше слово на 'Р'..." 
                    className="flex-1 bg-bg-primary p-4 rounded-2xl outline-none border border-slate-800 text-sm font-black italic uppercase"
                />
                <button className="bg-accent p-4 rounded-2xl text-white shadow-lg"><ArrowRight size={24} /></button>
            </div>
        </div>
    );
};

export const ArrowRight = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);
