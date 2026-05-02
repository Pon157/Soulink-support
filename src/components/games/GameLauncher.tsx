import React, { useState, useEffect } from 'react';
import { X, Trophy, MessageSquare, Gamepad2, Swords, Brain, Hash, Edit3, Shield, Video, Timer, RefreshCw, Star, Trash, Reply, Camera, Mic, ArrowRight, Loader2, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Modal } from '../ui/Modal';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

import { apiFetch } from '../../lib/api';

interface GameLauncherProps {
  gameType: 'chess' | 'checkers' | 'words' | 'seabattle';
  sessionId: string;
  onClose: () => void;
  partnerName: string;
  currentUserId: string;
}

export const GameLauncher = ({ gameType, sessionId, onClose, partnerName, currentUserId }: GameLauncherProps) => {
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
      case 'chess': return <ChessGame sessionId={sessionId} partnerName={partnerName} currentUserId={currentUserId} state={gameState.state} />;
      case 'words': return <WordsGame sessionId={sessionId} partnerName={partnerName} currentUserId={currentUserId} state={gameState.state} />;
      case 'checkers': return <CheckersGame sessionId={sessionId} partnerName={partnerName} currentUserId={currentUserId} state={gameState.state} />;
      case 'seabattle': return <SeaBattleGame sessionId={sessionId} partnerName={partnerName} currentUserId={currentUserId} state={gameState.state} />;
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

const ChessGame = ({ sessionId, partnerName, currentUserId, state }: { sessionId: string, partnerName: string, currentUserId: string, state: any }) => {
    const [game, setGame] = useState(new Chess(state?.fen === 'start' ? undefined : state?.fen));

    useEffect(() => {
        if (state?.fen) {
            try {
                const newGame = new Chess(state.fen === 'start' ? undefined : state.fen);
                setGame(newGame);
            } catch (e) { console.error(e); }
        }
    }, [state?.fen]);

    function onDrop(sourceSquare: string, targetSquare: string) {
        const myColor = state.players?.[0]?.id === currentUserId ? 'w' : 'b';
        if (game.turn() !== myColor) return false;

        try {
            const move = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q",
            });

            if (move === null) return false;

            apiFetch(`/api/games/${sessionId}/move`, {
                method: 'POST',
                body: JSON.stringify({ 
                    state: { ...state, fen: game.fen(), turn: game.turn() === 'w' ? 'white' : 'black' },
                    move: { from: sourceSquare, to: targetSquare, piece: move.piece, san: move.san }
                })
            });

            return true;
        } catch (e) { return false; }
    }

    const myColor = state.players?.[0]?.id === currentUserId ? 'w' : 'b';
    const isCurrentTurnMe = game.turn() === myColor;
    
    return (
        <div className="w-full max-w-md aspect-square bg-slate-900 rounded-[3rem] overflow-hidden border-8 border-slate-800 shadow-2xl relative transition-all animate-in zoom-in duration-500 p-2">
            <Chessboard 
                position={game.fen()} 
                onPieceDrop={onDrop} 
                boardOrientation={partnerName === state.players?.[0]?.nickname ? 'black' : 'white'}
                customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
            />
            
            {game.isGameOver() && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center space-y-4 backdrop-blur-md z-30">
                    <Trophy className="text-amber-500 animate-bounce" size={64} />
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Игра окончена!</h2>
                    <p className="text-text-dim font-bold uppercase text-[10px] tracking-widest">
                        {game.isCheckmate() ? 'Мат!' : game.isDraw() ? 'Ничья' : 'Сдался'}
                    </p>
                </div>
            )}

            {!isCurrentTurnMe && !game.isGameOver() && (
                <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none">
                    <div className="bg-bg-primary/95 backdrop-blur-md p-6 rounded-[2.5rem] border border-accent/30 text-center space-y-2 shadow-2xl max-w-xs transform -rotate-1 pointer-events-auto">
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
            )}
        </div>
    );
};

const CheckersGame = ({ sessionId, partnerName, currentUserId, state }: any) => {
    const [selected, setSelected] = useState<number | null>(null);
    const [board, setBoard] = useState<any[]>(state?.board || []);

    const myIndex = state.players?.[0]?.id === currentUserId ? 0 : 1;
    const isMyTurn = state.turn === (myIndex === 0 ? 'white' : 'black');
    const myColor = myIndex === 0 ? 'white' : 'black';

    useEffect(() => {
        if (!state?.board) {
            // Initialize board if empty
            const newBoard = Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isBlackSquare = (row + col) % 2 === 1;
                if (!isBlackSquare) return null;
                if (row < 3) return { color: 'black', king: false };
                if (row > 4) return { color: 'white', king: false };
                return null;
            });
            setBoard(newBoard);
        } else {
            setBoard(state.board);
        }
    }, [state?.board]);

    const handleSquareClick = async (index: number) => {
        if (!isMyTurn) return;

        const piece = board[index];
        if (selected === null) {
            if (piece && piece.color === myColor) {
                setSelected(index);
            }
        } else {
            // Attempt move
            if (index === selected) {
                setSelected(null);
                return;
            }

            const fromRow = Math.floor(selected / 8);
            const fromCol = selected % 8;
            const toRow = Math.floor(index / 8);
            const toCol = index % 8;

            const rowDiff = toRow - fromRow;
            const colDiff = Math.abs(toCol - fromCol);

            // Basic diagonal check
            if (colDiff === Math.abs(rowDiff)) {
                let isValid = false;
                let capturedIndex = null;

                if (colDiff === 1) {
                    // Normal move
                    if (!board[index]) {
                        if (myColor === 'white' && rowDiff === -1) isValid = true;
                        if (myColor === 'black' && rowDiff === 1) isValid = true;
                        if (board[selected].king) isValid = true;
                    }
                } else if (colDiff === 2) {
                    // Jump move
                    const midRow = fromRow + rowDiff / 2;
                    const midCol = fromCol + (toCol - fromCol) / 2;
                    const midIndex = midRow * 8 + midCol;
                    const midPiece = board[midIndex];

                    if (!board[index] && midPiece && midPiece.color !== myColor) {
                        isValid = true;
                        capturedIndex = midIndex;
                    }
                }

                if (isValid) {
                    const newBoard = [...board];
                    newBoard[index] = { ...newBoard[selected] };
                    newBoard[selected] = null;
                    if (capturedIndex !== null) newBoard[capturedIndex] = null;

                    // King promotion
                    if (myColor === 'white' && toRow === 0) newBoard[index].king = true;
                    if (myColor === 'black' && toRow === 7) newBoard[index].king = true;

                    // Update state
                    try {
                        await apiFetch(`/api/games/${sessionId}/move`, {
                            method: 'POST',
                            body: JSON.stringify({ 
                                state: { 
                                    ...state, 
                                    board: newBoard, 
                                    turn: myColor === 'white' ? 'black' : 'white' 
                                } 
                            })
                        });
                        setSelected(null);
                    } catch (e) { console.error(e); }
                }
            }
            setSelected(null);
        }
    };

    return (
        <div className="w-full max-w-md aspect-square bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-8 grid-rows-8 h-full bg-slate-800">
                {board.map((piece, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isWhiteSquare = (row + col) % 2 === 0;
                    return (
                        <div 
                            key={i} 
                            onClick={() => handleSquareClick(i)}
                            className={cn(
                                "flex items-center justify-center relative backdrop-blur-sm transition-all",
                                isWhiteSquare ? 'bg-slate-300' : 'bg-slate-700',
                                isMyTurn && piece?.color === myColor && "cursor-pointer hover:bg-slate-600",
                                selected === i && "ring-4 ring-accent ring-inset z-10"
                            )}
                        >
                            {piece && (
                                <motion.div 
                                    layoutId={`piece-${i}-${piece.color}`}
                                    className={cn(
                                        "w-10 h-10 md:w-12 md:h-12 rounded-full shadow-2xl border-2 flex items-center justify-center",
                                        piece.color === 'white' ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700'
                                    )}
                                >
                                    {piece.king && <Shield className={piece.color === 'white' ? 'text-slate-400' : 'text-slate-600'} size={16} />}
                                </motion.div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {!isMyTurn && (
                <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none">
                    <div className="bg-bg-primary/95 backdrop-blur-md p-6 rounded-[2.5rem] border border-accent/20 text-center space-y-2 shadow-2xl pointer-events-auto transform -rotate-1">
                        <p className="text-xs font-black uppercase text-accent animate-pulse italic">Ожидание хода {partnerName}...</p>
                        <p className="text-[8px] text-text-dim font-black uppercase tracking-widest leading-none">Соперник выбирает стратегию</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const WordsGame = ({ sessionId, partnerName, currentUserId, state }: { sessionId: string, partnerName: string, currentUserId: string, state: any }) => {
    const [words, setWords] = useState<string[]>(state?.words || []);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    
    // Check if it's current user's turn
    const isMyTurn = state?.turn === currentUserId; 

    useEffect(() => {
        if (state?.words) {
            setWords(state.words);
            const lastW = state.words[state.words.length - 1];
            if (lastW && isMyTurn) {
                const lastChar = lastW.charAt(lastW.length - 1).toUpperCase();
                if (!input.startsWith(lastChar)) {
                    setInput(lastChar);
                }
            }
        }
    }, [state?.words, isMyTurn]);

    const handleSendWord = async () => {
        const cleanedInput = input.trim().toUpperCase();
        if (!cleanedInput || sending || !isMyTurn) return;
        
        if (words.length > 0) {
            const lastWord = words[words.length - 1];
            const lastChar = lastWord.charAt(lastWord.length - 1).toUpperCase();
            if (cleanedInput.charAt(0).toUpperCase() !== lastChar) {
                return;
            }
        }

        setSending(true);
        try {
            const nextWords = [...words, cleanedInput];
            await apiFetch(`/api/games/${sessionId}/move`, {
                method: 'POST',
                body: JSON.stringify({ 
                    state: { 
                        ...state, 
                        words: nextWords,
                        turn: partnerName 
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
                    disabled={sending || !isMyTurn || !input || (words.length > 0 && input.length <= 1)}
                    className="bg-accent w-14 h-14 rounded-2xl text-white shadow-xl shadow-accent/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    {sending ? <RefreshCw className="animate-spin" size={24} /> : <ArrowRight size={28} />}
                </button>
            </div>
        </div>
    );
};

const SeaBattleGame = ({ sessionId, partnerName, currentUserId, state }: any) => {
    const myIndex = state.players?.[0]?.id === currentUserId ? 0 : 1;
    const oppIndex = 1 - myIndex;

    const [ships, setShips] = useState<number[]>(state?.players?.[myIndex]?.ships || []);
    const [shots, setShots] = useState<number[]>(state?.players?.[myIndex]?.shots || []);
    const [opponentShots, setOpponentShots] = useState<number[]>(state?.players?.[oppIndex]?.shots || []);
    const [ready, setReady] = useState<boolean>(state?.players?.[myIndex]?.ready || false);
    const [opponentReady, setOpponentReady] = useState<boolean>(state?.players?.[oppIndex]?.ready || false);

    const toggleShip = async (index: number) => {
        if (ready) return;
        let newShips = [...ships];
        if (newShips.includes(index)) {
            newShips = newShips.filter(s => s !== index);
        } else {
            if (newShips.length >= 20) return;
            newShips.push(index);
        }
        setShips(newShips);
        updateState({ ships: newShips });
    };

    const handleReady = () => {
        if (ships.length < 20) return;
        setReady(true);
        updateState({ ready: true });
    };

    const handleShoot = async (index: number) => {
        if (!ready || !opponentReady || state.turn !== (myIndex === 0 ? 'white' : 'black') || shots.includes(index)) return;
        
        const newShots = [...shots, index];
        setShots(newShots);
        
        const opponentShips = state.players[oppIndex].ships;
        const hit = opponentShips.includes(index);
        
        updateState({ shots: newShots }, true, hit); // if hit, turn stays
    };

    const updateState = async (myData: any, isMove = false, keepTurn = false) => {
        const newState = { ...state };
        newState.players[myIndex] = { ...newState.players[myIndex], ...myData };
        if (isMove && !keepTurn) {
            newState.turn = myIndex === 0 ? 'black' : 'white';
        }
        try {
            await apiFetch(`/api/games/${sessionId}/move`, {
                method: 'POST',
                body: JSON.stringify({ state: newState })
            });
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (state?.players) {
            const p = state.players[myIndex];
            const op = state.players[oppIndex];
            setShips(p.ships || []);
            setShots(p.shots || []);
            setOpponentShots(op.shots || []);
            setReady(p.ready || false);
            setOpponentReady(op.ready || false);
        }
    }, [state]);

    const isMyTurn = ready && opponentReady && state.turn === (myIndex === 0 ? 'white' : 'black');

    return (
        <div className="w-full max-w-2xl h-full flex flex-col p-8 space-y-6 animate-in zoom-in duration-500 overflow-y-auto">
            <div className="flex flex-wrap gap-8 justify-center">
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-center text-emerald-400 tracking-widest">Мои Воды ({ships.length}/20)</p>
                    <div className="grid grid-cols-10 grid-rows-10 gap-px bg-slate-800 border-4 border-slate-700 aspect-square w-64 md:w-80 rounded-2xl overflow-hidden shadow-2xl relative">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div 
                                key={i} 
                                onClick={() => toggleShip(i)}
                                className={cn(
                                    "bg-slate-900 transition-colors relative",
                                    ships.includes(i) ? "bg-emerald-500/40" : "",
                                    !ready && "hover:bg-slate-800 cursor-pointer"
                                )} 
                            >
                                {opponentShots.includes(i) && (
                                    <div className={cn("absolute inset-0 flex items-center justify-center font-bold text-xs", ships.includes(i) ? "text-rose-500" : "text-white/20")}>
                                        {ships.includes(i) ? '💥' : '•'}
                                    </div>
                                )}
                            </div>
                        ))}
                        {!ready && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-6 opacity-0 hover:opacity-100 transition-opacity">
                                <p className="text-[10px] font-black uppercase text-white tracking-widest text-center">Нажимайте для расстановки</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-center text-rose-500 tracking-widest">Вражеский Флот</p>
                    <div className="grid grid-cols-10 grid-rows-10 gap-px bg-slate-800 border-4 border-slate-700 aspect-square w-64 md:w-80 rounded-2xl overflow-hidden shadow-2xl relative">
                        {Array.from({ length: 100 }).map((_, i) => {
                            const isHit = shots.includes(i) && state.players[oppIndex].ships.includes(i);
                            const isMiss = shots.includes(i) && !state.players[oppIndex].ships.includes(i);

                            return (
                                <div 
                                    key={i} 
                                    onClick={() => handleShoot(i)}
                                    className={cn(
                                        "bg-slate-900 group relative",
                                        isMyTurn && !shots.includes(i) && "cursor-crosshair hover:bg-slate-800"
                                    )}
                                >
                                    {isMyTurn && !shots.includes(i) && <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-20 transition-opacity" />}
                                    {isHit && <div className="absolute inset-0 flex items-center justify-center text-rose-500 font-bold text-xs">💥</div>}
                                    {isMiss && <div className="absolute inset-0 flex items-center justify-center text-white/20 font-bold text-xs">•</div>}
                                </div>
                            );
                        })}
                        {!opponentReady && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-8">
                                <div className="text-center space-y-2">
                                    <RefreshCw className="animate-spin text-accent mx-auto" size={24} />
                                    <p className="text-[9px] font-black uppercase text-white tracking-widest">Противник расставляет силы...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-4 mt-4">
                {!ready && (
                    <button 
                        onClick={handleReady}
                        disabled={ships.length < 20}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                        Готов к бою
                    </button>
                )}
                {ready && opponentReady && (
                    <div className={cn(
                        "px-8 py-4 rounded-[2rem] border transition-all shadow-2xl",
                        isMyTurn ? "bg-accent border-white/20 animate-pulse" : "bg-bg-primary border-slate-800"
                    )}>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] italic text-white">
                            {isMyTurn ? 'Твой огонь!' : `Ход ${partnerName}...`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ArrowRight = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);
