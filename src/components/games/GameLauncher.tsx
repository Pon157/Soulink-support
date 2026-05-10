import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  const partnerId = gameState?.players?.find((p: any) => p?.id !== currentUserId)?.id;

    const fetchMessages = useCallback(async () => {
    if (!partnerId) return;
    try {
      const res = await apiFetch(`/api/messages/${partnerId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        if (data.length > 0) {
          if (lastMessageId === null) {
            // Initial load - don't count unread, just set the reference
            setLastMessageId(data[data.length - 1].id);
          } else {
            const newMessages = data.filter((m: any) => m.id > lastMessageId && m.senderId !== currentUserId);
            if (newMessages.length > 0 && !showChat) {
              setUnreadCount(prev => prev + newMessages.length);
            }
            setLastMessageId(data[data.length - 1].id);
          }
        }
      }
    } catch (e) {}
  }, [partnerId, lastMessageId, showChat, currentUserId]);

  useEffect(() => {
    if (showChat) {
        setUnreadCount(0);
        // Also update lastSeen locally to prevent issues
        if (messages.length > 0) {
            setLastMessageId(messages[messages.length - 1].id);
        }
    }
  }, [showChat, messages]);

  useEffect(() => {
    if (partnerId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [partnerId, fetchMessages]);

  const gameIntervalRef = useRef<any>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchGame = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const res = await apiFetch(`/api/games/${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                setGameState(data);
                setLoading(false);
            }
        } catch (e) { console.error(e); }
        finally { isFetchingRef.current = false; }
    };
    fetchGame();
    gameIntervalRef.current = setInterval(fetchGame, 1500);
    return () => clearInterval(gameIntervalRef.current);
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
      case 'seabattle': return <SeaBattleGame sessionId={sessionId} partnerName={partnerName} currentUserId={currentUserId} state={gameState.state} onClose={onClose} />;
      default: return (
        <div className="text-center space-y-6 max-w-xs transition-all animate-in fade-in zoom-in duration-500 px-8">
            <div className="w-24 h-24 bg-accent/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-accent/10">
                <Timer className="text-accent animate-bounce" size={40} />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">В разработке</h3>
                <p className="text-[10px] text-text-dim uppercase font-black tracking-widest leading-relaxed">Разработчики SoulLink трудятся над этим разделом. Скоро здесь будет жарко!</p>
            </div>
            <button onClick={onClose} className="w-full py-4 bg-bg-primary border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-accent transition-all">Закрыть</button>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-bg-primary/95 backdrop-blur-3xl flex flex-col md:flex-row p-4 md:p-6 lg:p-8 animate-in fade-in duration-300 gap-4 md:gap-6 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <header className="flex items-center justify-between mb-4 md:mb-8 w-full max-w-4xl">
            <div className="flex items-center gap-3 md:gap-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-accent rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-accent/40 relative">
                <div className="absolute inset-0 bg-white/20 rounded-[1.5rem] md:rounded-[2rem] animate-pulse" />
                <Gamepad2 className="relative" size={24} />
            </div>
            <div>
                <h2 className="text-xl md:text-3xl font-black italic text-text-main uppercase tracking-tighter leading-none">
                {gameType === 'chess' ? 'Шахматный Мастер' : gameType === 'words' ? 'Битва Слов' : gameType === 'checkers' ? 'Ударные Шашки' : 'SoulБитва'}
                </h2>
                <div className="flex items-center gap-2 mt-1 md:mt-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-ping" />
                    <p className="text-[9px] md:text-[11px] font-black text-accent uppercase tracking-widest truncate max-w-[120px] md:max-w-none">ПРОТИВ {partnerName}</p>
                </div>
            </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                <button 
                    onClick={() => setShowChat(!showChat)}
                    className={cn(
                        "p-3 md:p-4 rounded-xl md:rounded-2xl transition-all active:scale-95 flex items-center gap-2 font-black text-[9px] md:text-[10px] uppercase tracking-widest relative",
                        showChat ? "bg-accent text-white" : "bg-bg-secondary text-text-dim hover:text-text-main"
                    )}
                >
                    <MessageSquare size={18} />
                    <span className="hidden sm:inline">{showChat ? 'Скрыть чат' : 'Чат игры'}</span>
                    {!showChat && unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center border-2 border-bg-primary animate-bounce shadow-lg font-black">{unreadCount}</span>}
                </button>
                <button onClick={onClose} className="p-3 md:p-4 bg-bg-secondary rounded-xl md:rounded-[1.5rem] text-text-dim hover:text-text-main transition-all active:scale-90"><X size={24} /></button>
            </div>
        </header>

        <div className="flex-1 bg-bg-secondary/50 rounded-[2.5rem] md:rounded-[4rem] border border-white/5 shadow-2xl overflow-hidden relative flex flex-col items-center justify-center w-full max-w-4xl backdrop-blur-md">
            {renderGame()}
        </div>
      </div>

      {showChat && (
          <div className="absolute right-4 bottom-4 top-20 md:relative md:inset-auto w-[calc(100%-2rem)] md:w-[320px] lg:w-[400px] xl:w-[500px] h-[calc(100%-6rem)] md:h-full bg-bg-primary/95 md:bg-bg-primary/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col animate-in slide-in-from-right duration-500 shadow-2xl z-[100]">
              <ChatInGame 
                sessionId={sessionId} 
                partnerName={partnerName} 
                currentUserId={currentUserId} 
                gameState={gameState} 
                messages={messages}
                onRefresh={fetchMessages}
              />
          </div>
      )}
    </div>
  );
};

const ChatInGame = ({ partnerName, currentUserId, gameState, messages, onRefresh }: any) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const partner = gameState?.players?.find((p: any) => p?.id !== currentUserId);
    const chatId = partner?.id;

    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            // Robust bottom detection
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
            
            // Only scroll if we move to a new message and were at bottom, or it's the first message
            if (isAtBottom || messages.length <= 1) {
                const scrollTimeout = setTimeout(() => {
                    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
                return () => clearTimeout(scrollTimeout);
            }
        }
    }, [messages.length]);

    const handleSend = async () => {
        if (!input.trim() || !chatId) return;
        try {
            await apiFetch(`/api/messages`, {
                method: 'POST',
                body: JSON.stringify({ receiverId: chatId, content: input })
            });
            setInput('');
            onRefresh();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="flex flex-col h-full bg-bg-secondary/30">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/20 text-accent rounded-xl flex items-center justify-center">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-text-main uppercase tracking-widest leading-none">{partnerName}</p>
                        <p className="text-[8px] text-accent font-bold uppercase mt-1">Чат игры</p>
                    </div>
                </div>
            </div>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg: any, i: number) => (
                    <div key={i} className={cn("flex flex-col", msg.senderId === currentUserId ? "items-end" : "items-start")}>
                        <div className={cn(
                            "max-w-[85%] p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-lg",
                            msg.senderId === currentUserId ? "bg-accent text-white rounded-tr-none" : "bg-bg-primary text-text-main border border-white/5 rounded-tl-none"
                        )}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>
            <div className="p-6 bg-bg-secondary/50 border-t border-white/5 flex gap-2">
                <input 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Напишите..."
                    className="flex-1 bg-bg-primary border border-white/10 rounded-xl px-4 py-3 text-sm text-text-main placeholder-text-dim outline-none focus:border-accent/40 transition-all"
                />
                <button 
                    onClick={handleSend}
                    className="w-12 h-12 bg-accent text-white rounded-xl shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center justify-center"
                >
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

const ChessGame = ({ sessionId, partnerName, currentUserId, state }: { sessionId: string, partnerName: string, currentUserId: string, state: any }) => {
    const [game, setGame] = useState(new Chess(state?.fen === 'start' ? undefined : state?.fen));
    const [moveFrom, setMoveFrom] = useState<string | null>(null);
    const [optionSquares, setOptionSquares] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastReceivedFen, setLastReceivedFen] = useState(state?.fen);
    const [lastMoveTimestamp, setLastMoveTimestamp] = useState(0);

    const myPlayerIndex = state.players?.findIndex((p: any) => p.id === currentUserId);
    const myColor = myPlayerIndex === 0 ? 'w' : 'b';
    const isCurrentTurnMe = game.turn() === myColor;

    const movableSquares = useMemo(() => {
        if (!isCurrentTurnMe || isProcessing || !!moveFrom) return {};
        const squares: any = {};
        const items = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = items[r][c];
                if (p && p.color === myColor) {
                    const square = `${String.fromCharCode(97 + c)}${8 - r}`;
                    const moves = game.moves({ square: square as any });
                    if (moves.length > 0) {
                        squares[square] = {
                            cursor: 'pointer',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)'
                        };
                    }
                }
            }
        }
        return squares;
    }, [game, isCurrentTurnMe, isProcessing, myColor, moveFrom]);

    const combinedOptionSquares = useMemo(() => ({
        ...movableSquares,
        ...optionSquares
    }), [movableSquares, optionSquares]);

    useEffect(() => {
        if (isProcessing) return;
        const now = Date.now();
        
        // RECONCILIATION:
        // If we moved recently, we strictly ignore the server state until it reports a turn change
        // or a long timeout (10s) expires.
        if (now - lastMoveTimestamp < 10000) {
            const serverGame = new Chess(state?.fen === 'start' ? undefined : state?.fen);
            // If the server still says it's my turn, it means our move isn't fully processed/broadcasted.
            if (serverGame.turn() === myColor) return;
        }

        if (state?.fen && state.fen !== game.fen() && state.fen !== lastReceivedFen) {
            try {
                const serverGame = new Chess(state.fen === 'start' ? undefined : state.fen);
                setGame(serverGame);
                setLastReceivedFen(state.fen);
                setOptionSquares({});
                setMoveFrom(null);
            } catch (e) { console.error(e); }
        }
    }, [state?.fen, isProcessing, lastMoveTimestamp, myColor, lastReceivedFen]);

    async function syncMove(fen: string, result: any) {
        setIsProcessing(true);
        try {
            await apiFetch(`/api/games/${sessionId}/move`, {
                method: 'POST',
                body: JSON.stringify({ 
                    state: { ...state, fen: fen, turn: game.turn() === 'w' ? 'black' : 'white' },
                    move: { from: result.from, to: result.to, piece: result.piece, san: result.san }
                })
            });
            setLastReceivedFen(fen);
        } catch (e) { console.error(e); }
        finally {
            setIsProcessing(false);
        }
    }

    function makeMove(move: any) {
        if (isProcessing) return null;
        try {
            const gameCopy = new Chess(game.fen());
            const result = gameCopy.move(move);
            if (result) {
                setGame(gameCopy);
                // Mark the NEW FEN as the one we expect/ignore until server catches up
                setLastReceivedFen(gameCopy.fen()); 
                setLastMoveTimestamp(Date.now());
                syncMove(gameCopy.fen(), result);
                return result;
            }
        } catch (e) { return null; }
        return null;
    }

    function showHints(square: string) {
        try {
            const moves = game.moves({
                square: square as any,
                verbose: true,
            });
            if (moves.length === 0) return false;

            const newSquares: any = {};
            moves.forEach((move) => {
                newSquares[move.to] = {
                    background: move.captured ? 
                        "radial-gradient(circle, rgba(239, 68, 68, 0.4) 60%, transparent 65%)" :
                        "radial-gradient(circle, rgba(255, 255, 255, 0.3) 30%, transparent 35%)",
                    borderRadius: "50%",
                    cursor: 'pointer'
                };
            });
            newSquares[square] = {
                backgroundColor: "rgba(59, 130, 246, 0.4)",
                borderRadius: "8px"
            };
            setOptionSquares(newSquares);
            return true;
        } catch (e) { return false; }
    }

    const onSquareClick = (square: string) => {
        if (!isCurrentTurnMe || isProcessing) return;

        // If clicking same square, deselect
        if (moveFrom === square) {
            setMoveFrom(null);
            setOptionSquares({});
            return;
        }

        // If a piece is already selected, try to move
        if (moveFrom) {
            const move = makeMove({
                from: moveFrom,
                to: square,
                promotion: "q",
            });

            if (move) {
                setMoveFrom(null);
                setOptionSquares({});
                return;
            }
            
            // If move failed, maybe we clicked another of our pieces?
            const piece = game.get(square as any);
            if (piece && piece.color === myColor) {
               setMoveFrom(square);
               showHints(square);
               return;
            }
            
            // Otherwise deselect
            setMoveFrom(null);
            setOptionSquares({});
            return;
        }

        // Select piece and show hints
        const piece = game.get(square as any);
        if (piece && piece.color === myColor) {
            setMoveFrom(square);
            showHints(square);
        }
    };

    function onDrop(sourceSquare: string, targetSquare: string) {
        if (!isCurrentTurnMe) return false;
        const move = makeMove({ from: sourceSquare, to: targetSquare, promotion: "q" });
        if (move) {
            setMoveFrom(null);
            setOptionSquares({});
            return true;
        }
        return false;
    }

    const ChessboardAny = Chessboard as any;

    return (
        <div className="w-full max-w-sm md:max-w-md aspect-square bg-bg-secondary rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border-[6px] md:border-[12px] border-bg-primary shadow-2xl relative transition-all animate-in zoom-in duration-500 p-1 md:p-3 touch-none">
            <ChessboardAny 
                id="BasicBoard"
                position={game.fen()} 
                onPieceDrop={onDrop} 
                onSquareClick={onSquareClick}
                onPieceDragBegin={(_piece: string, square: string) => showHints(square)}
                onPieceDragEnd={() => !moveFrom && setOptionSquares({})}
                animationDuration={300}
                customSquareStyles={combinedOptionSquares}
                boardOrientation={myPlayerIndex === 1 ? 'black' : 'white'}
                customDarkSquareStyle={{ backgroundColor: '#475569' }}
                customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                customBoardStyle={{ 
                    borderRadius: '0.75rem', 
                    overflow: 'hidden',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
                }}
                draggable={isCurrentTurnMe}
            />
            {game.isGameOver() && (
                <div className="absolute inset-0 bg-bg-primary/90 flex flex-col items-center justify-center p-8 text-center space-y-4 backdrop-blur-md z-30">
                    <Trophy className="text-amber-500 animate-bounce" size={64} />
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">Игра окончена!</h2>
                    <p className="text-text-dim font-bold uppercase text-[10px] tracking-widest">
                        {game.isCheckmate() ? 'Мат!' : game.isDraw() ? 'Ничья' : 'Сдался'}
                    </p>
                </div>
            )}
            {!isCurrentTurnMe && !game.isGameOver() && (
                <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none">
                    <div className="bg-bg-primary/95 backdrop-blur-md p-6 rounded-[2.5rem] border border-accent/20 text-center space-y-2 shadow-2xl max-w-xs pointer-events-auto transform -rotate-1">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                                <Brain className="text-accent animate-pulse" size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-black italic uppercase tracking-tighter text-text-main">Ход {partnerName}...</p>
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastMoveTimestamp, setLastMoveTimestamp] = useState(0);

    const myPlayerIndex = state?.players?.findIndex((p: any) => p.id === currentUserId);
    const myIndex = myPlayerIndex === -1 || myPlayerIndex === undefined ? 0 : myPlayerIndex;
    const isMyTurn = state?.turn === (myIndex === 0 ? 'white' : 'black');
    const myColor = myIndex === 0 ? 'white' : 'black';

    useEffect(() => {
        if (isProcessing) return;
        const now = Date.now();
        
        // Reconciliation for Checkers
        if (now - lastMoveTimestamp < 10000) {
            // If server turn matches our turn, but we just move, ignore it to prevent snap-back
            if (state?.turn === myColor) return;
        }

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
            // Only update if board actually changed or it's not our turn
            // This prevents the flickering reset during multiple jumps
            if (JSON.stringify(state.board) !== JSON.stringify(board)) {
                setBoard(state.board);
            }
        }
    }, [state?.board, state?.turn, isProcessing, lastMoveTimestamp, myColor, board]);

    const getValidMoves = useCallback((idx: number) => {
        if (!board[idx] || board[idx].color !== myColor) return [];
        const moves = [];
        const fromRow = Math.floor(idx / 8);
        const fromCol = idx % 8;

        const isKing = board[idx].king;
        const directions = [[1,1], [1,-1], [-1,1], [-1,-1]];
        
        if (isKing) {
            // Long-range king logic
            for (const [dr, dc] of directions) {
                let nr = fromRow + dr;
                let nc = fromCol + dc;
                while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                    const targetIdx = nr * 8 + nc;
                    if (!board[targetIdx]) {
                        moves.push(targetIdx);
                        nr += dr;
                        nc += dc;
                    } else {
                        // Potential jump
                        if (board[targetIdx].color !== myColor) {
                            const jr = nr + dr;
                            const jc = nc + dc;
                            if (jr >= 0 && jr <= 7 && jc >= 0 && jc <= 7 && !board[jr * 8 + jc]) {
                                moves.push(jr * 8 + jc);
                            }
                        }
                        break; // Blocked
                    }
                }
            }
        } else {
            // Normal piece logic
            const moves_dir = myColor === 'white' ? [[-1,1], [-1,-1]] : [[1,1], [1,-1]];
            for (const [dr, dc] of moves_dir) {
                const nr = fromRow + dr;
                const nc = fromCol + dc;
                if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                    if (!board[nr * 8 + nc]) {
                        moves.push(nr * 8 + nc);
                    } else if (board[nr * 8 + nc].color !== myColor) {
                        const jr = nr + dr;
                        const jc = nc + dc;
                        if (jr >= 0 && jr <= 7 && jc >= 0 && jc <= 7 && !board[jr * 8 + jc]) {
                            moves.push(jr * 8 + jc);
                        }
                    }
                }
            }
        }
        return moves;
    }, [board, myColor]);

    const validMoves = useMemo(() => selected !== null ? getValidMoves(selected) : [], [selected, getValidMoves]);

    const canJumpAgain = useCallback((idx: number, currentBoard: any[]) => {
        const piece = currentBoard[idx];
        if (!piece) return false;
        const fromRow = Math.floor(idx / 8);
        const fromCol = idx % 8;

        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        if (piece.king) {
            for (const [dr, dc] of directions) {
                let r = fromRow + dr;
                let c = fromCol + dc;
                let foundEnemy = false;
                
                while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                    const currentIdx = r * 8 + c;
                    const currentPiece = currentBoard[currentIdx];
                    
                    if (!foundEnemy) {
                        if (currentPiece) {
                            if (currentPiece.color !== piece.color) {
                                foundEnemy = true;
                            } else {
                                break; // Blocked by own piece
                            }
                        }
                    } else {
                        if (!currentPiece) {
                            return true; // Can jump here
                        } else {
                            break; // Blocked after enemy
                        }
                    }
                    r += dr;
                    c += dc;
                }
            }
        } else {
            for (const [dr, dc] of directions) {
                const midR = fromRow + dr;
                const midC = fromCol + dc;
                const toR = fromRow + dr * 2;
                const toC = fromCol + dc * 2;

                if (toR >= 0 && toR <= 7 && toC >= 0 && toC <= 7) {
                    const midIdx = midR * 8 + midC;
                    const toIdx = toR * 8 + toC;
                    const targetPiece = currentBoard[midIdx];
                    const landingSquare = currentBoard[toIdx];

                    if (targetPiece && targetPiece.color !== piece.color && !landingSquare) {
                        return true;
                    }
                }
            }
        }
        return false;
    }, []);

    const handleSquareClick = async (index: number) => {
        if (!isMyTurn || isProcessing) return;

        const piece = board[index];
        if (selected === null) {
            if (piece && piece.color === myColor) {
                setSelected(index);
            }
        } else {
            if (index === selected) {
                // Allow deselecting ONLY if we haven't just performed a jump that requires more jumps
                setSelected(null);
                return;
            }

            if (!validMoves.includes(index)) {
                if (piece && piece.color === myColor) setSelected(index);
                else setSelected(null);
                return;
            }

            const fromRow = Math.floor(selected / 8);
            const fromCol = selected % 8;
            const toRow = Math.floor(index / 8);
            const toCol = index % 8;
            const colDiff = Math.abs(toCol - fromCol);

            let capturedIndex = null;
            if (colDiff >= 2) {
                const dr = toRow > fromRow ? 1 : -1;
                const dc = toCol > fromCol ? 1 : -1;
                let r = fromRow + dr;
                let c = fromCol + dc;
                while (r !== toRow && c !== toCol) {
                    const midIdx = r * 8 + c;
                    if (board[midIdx]) {
                        capturedIndex = midIdx;
                        break;
                    }
                    r += dr;
                    c += dc;
                }
            }

            const newBoard = [...board];
            newBoard[index] = { ...newBoard[selected] };
            newBoard[selected] = null;
            if (capturedIndex !== null) newBoard[capturedIndex] = null;

            if (myColor === 'white' && toRow === 0) newBoard[index].king = true;
            if (myColor === 'black' && toRow === 7) newBoard[index].king = true;

            const jumped = capturedIndex !== null;
            const jumpsAvailable = jumped && canJumpAgain(index, newBoard);

            try {
                // Optimistic update
                setBoard(newBoard);
                setLastMoveTimestamp(Date.now());
                
                if (jumpsAvailable) {
                    setSelected(index);
                    // Notify server about intermediate state but keep turn
                    apiFetch(`/api/games/${sessionId}/move`, {
                        method: 'POST',
                        body: JSON.stringify({ 
                            state: { 
                                ...state, 
                                board: newBoard, 
                                turn: myColor 
                            } 
                        })
                    });
                } else {
                    setSelected(null);
                    setIsProcessing(true);
                    apiFetch(`/api/games/${sessionId}/move`, {
                        method: 'POST',
                        body: JSON.stringify({ 
                            state: { 
                                ...state, 
                                board: newBoard, 
                                turn: myColor === 'white' ? 'black' : 'white' 
                            } 
                        })
                    }).finally(() => setIsProcessing(false));
                }
            } catch (e) { console.error(e); setIsProcessing(false); } 
        }
    };

    const memoBoard = useMemo(() => {
        const boardToRender = [...board];
        const isFlipped = myIndex === 1;

        return boardToRender.map((piece, i) => {
            const displayIdx = isFlipped ? 63 - i : i;
            const pieceAtDisplay = board[displayIdx];

            const row = Math.floor(displayIdx / 8);
            const col = displayIdx % 8;
            const isBlackSquare = (row + col) % 2 === 1;
            const isValidMove = validMoves.includes(displayIdx);

            return (
                <div 
                    key={displayIdx} 
                    onClick={() => handleSquareClick(displayIdx)}
                    className={cn(
                        "flex items-center justify-center relative backdrop-blur-sm transition-all h-full aspect-square",
                        !isBlackSquare ? 'bg-slate-200/50 dark:bg-slate-200/10' : 'bg-slate-800/50 dark:bg-slate-800/50',
                        isMyTurn && pieceAtDisplay?.color === myColor && "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5",
                        selected === displayIdx && "ring-4 ring-accent ring-inset z-10",
                        isValidMove && "bg-accent/20 cursor-pointer"
                    )}
                >
                    {pieceAtDisplay && (
                        <motion.div 
                            layoutId={`checkers-piece-${displayIdx}`}
                            initial={false}
                            className={cn(
                                "w-9 h-9 md:w-12 md:h-12 rounded-full shadow-lg border-2 flex items-center justify-center",
                                pieceAtDisplay.color === 'white' ? 'bg-slate-50 border-slate-300' : 'bg-slate-900 border-slate-800'
                            )}
                        >
                            {pieceAtDisplay.king && <Shield className={pieceAtDisplay.color === 'white' ? 'text-slate-300' : 'text-slate-600'} size={14} />}
                        </motion.div>
                    )}
                    {isValidMove && <div className="absolute w-2 h-2 md:w-3 md:h-3 bg-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />}
                </div>
            );
        });
    }, [board, selected, isMyTurn, myColor, validMoves, myIndex]);

    return (
        <div className="w-full max-w-md aspect-square bg-bg-secondary rounded-[3rem] border-8 border-bg-primary shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-8 grid-rows-8 h-full bg-slate-200/20 dark:bg-slate-800/20">
                {memoBoard}
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
    const [lastMoveTimestamp, setLastMoveTimestamp] = useState(0);
    
    // Check if it's current user's turn
    const isMyTurn = state?.turn === currentUserId; 
    const partner = state?.players?.find((p: any) => p.id !== currentUserId);

    useEffect(() => {
        if (sending) return;
        const now = Date.now();
        if (now - lastMoveTimestamp < 2000) return;

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
    }, [state?.words, isMyTurn, lastMoveTimestamp, sending]);

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
        setLastMoveTimestamp(Date.now());
        const nextWords = [...words, cleanedInput];
        setWords(nextWords); // Optimistic

        try {
            await apiFetch(`/api/games/${sessionId}/move`, {
                method: 'POST',
                body: JSON.stringify({ 
                    state: { 
                        ...state, 
                        words: nextWords,
                        turn: partner?.id || '' 
                    } 
                })
            });
            setInput('');
        } catch (e) { console.error(e); } finally { setSending(false); }
    };

    const handleInputChange = (val: string) => {
        let cleaned = val.toUpperCase().replace(/[^А-ЯA-Z]/g, '');
        if (words.length > 0) {
            const lastW = words[words.length - 1];
            const lastChar = lastW.charAt(lastW.length - 1).toUpperCase();
            
            // Strictly enforce the first character
            if (!cleaned.startsWith(lastChar)) {
                cleaned = lastChar + cleaned.replace(lastChar, '');
            }
            // Ensure even if they delete, the first char stays
            if (cleaned.length === 0) cleaned = lastChar;
        }
        setInput(cleaned);
    };

    return (
        <div className="w-full max-w-md h-full flex flex-col p-4 md:p-8 space-y-6 md:space-y-8 animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scroll-smooth">
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
                            i % 2 === 1 ? "bg-accent text-white border-white/10 ml-12" : "bg-bg-primary text-text-main border-white/5 mr-12"
                        )}
                    >
                        <p className="font-black italic text-xl tracking-tighter leading-none">{w}</p>
                        <div className={cn("absolute -bottom-2 text-[8px] font-black uppercase tracking-widest opacity-40 px-3", i % 2 === 1 ? "right-4" : "left-4 text-text-main")}>
                             {i % 2 === 1 ? 'Вы' : partnerName}
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="flex gap-4 items-center bg-bg-primary/50 p-4 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-xl relative">
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
                    onChange={e => handleInputChange(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSendWord()}
                    placeholder={isMyTurn ? "Слово..." : ""} 
                    disabled={sending || !isMyTurn}
                    className="flex-1 bg-transparent p-2 outline-none text-base md:text-lg font-black italic uppercase text-text-main tracking-tighter"
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

const SeaBattleGame = ({ sessionId, partnerName, currentUserId, state, onClose }: any) => {
    const myPlayerIndex = state?.players?.findIndex((p: any) => p?.id === currentUserId);
    const myIndex = myPlayerIndex === -1 || myPlayerIndex === undefined ? 0 : myPlayerIndex;
    const oppIndex = 1 - myIndex;

    const [ships, setShips] = useState<number[]>(state?.players?.[myIndex]?.ships || []);
    const [shots, setShots] = useState<number[]>(state?.players?.[myIndex]?.shots || []);
    const [opponentShots, setOpponentShots] = useState<number[]>(state?.players?.[oppIndex]?.shots || []);
    const [ready, setReady] = useState<boolean>(state?.players?.[myIndex]?.ready || false);
    const [opponentReady, setOpponentReady] = useState<boolean>(state?.players?.[oppIndex]?.ready || false);

    // Ship placement states
    const [orientation, setOrientation] = useState<'h' | 'v'>('h');
    const [shipCounts, setShipCounts] = useState({ 4: 0, 3: 0, 2: 0, 1: 0 });

    const SHIP_LIMITS = { 4: 1, 3: 2, 2: 3, 1: 4 };
    const [shipToPlace, setShipToPlace] = useState(4); // Current ship size to place

    const canPlaceShip = (index: number, size: number, orient: 'h' | 'v') => {
        if (shipCounts[size as keyof typeof shipCounts] >= SHIP_LIMITS[size as keyof typeof SHIP_LIMITS]) return null;

        const row = Math.floor(index / 10);
        const col = index % 10;
        
        let indices = [];
        for (let i = 0; i < size; i++) {
            const r = orient === 'v' ? row + i : row;
            const c = orient === 'h' ? col + i : col;
            if (r > 9 || c > 9) return null;
            indices.push(r * 10 + c);
        }

        // Check collisions and adjacency
        for (const idx of indices) {
            const r = Math.floor(idx / 10);
            const c = idx % 10;
            // Check neighbors (including diagonals and self)
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 9) {
                        if (ships.includes(nr * 10 + nc)) return null;
                    }
                }
            }
        }
        return indices;
    };

    const handleCellClick = (index: number) => {
        if (ready) return;
        
        const indices = canPlaceShip(index, shipToPlace, orientation);
        if (indices) {
            setShips(prev => [...prev, ...indices]);
            setShipCounts(prev => ({ ...prev, [shipToPlace]: prev[shipToPlace as keyof typeof prev] + 1 }));
            
            // Auto switch to next ship size
            const nextCounts = { ...shipCounts, [shipToPlace]: shipCounts[shipToPlace as keyof typeof shipCounts] + 1 };
            if (nextCounts[shipToPlace as keyof typeof nextCounts] >= SHIP_LIMITS[shipToPlace as keyof typeof SHIP_LIMITS]) {
                if (shipToPlace > 1) setShipToPlace(shipToPlace - 1);
            }
        } else {
            if (ships.includes(index)) {
                setShips([]);
                setShipCounts({ 4: 0, 3: 0, 2: 0, 1: 0 });
                setShipToPlace(4);
            }
        }
    };

    const handleReady = () => {
        if (ships.length !== 20) return; // 1*4 + 2*3 + 3*2 + 4*1 = 20 cells
        setReady(true);
        updateState({ ships, ready: true });
    };

    const handleShoot = async (index: number) => {
        if (!ready || !opponentReady || state?.turn !== (myIndex === 0 ? 'white' : 'black') || shots.includes(index) || state?.winner) return;
        
        const opponentShips = state.players[oppIndex].ships;
        const hit = opponentShips.includes(index);
        const newShots = [...shots, index];
        
        setShots(newShots);

        // Check for win
        let winner = undefined;
        const allHits = newShots.filter(s => opponentShips.includes(s));
        if (allHits.length === 20) {
            winner = currentUserId;
        }

        updateState({ shots: newShots }, true, hit, winner); 
    };

    const updateState = async (myData: any, isMove = false, keepTurn = false, winner?: string) => {
        const newState = { 
            ...state,
            players: state.players.map((p: any, idx: number) => 
                idx === myIndex ? { ...p, ...myData } : p
            )
        };
        if (isMove && !keepTurn) {
            newState.turn = myIndex === 0 ? 'black' : 'white';
        }
        if (winner) {
            newState.winner = winner;
            newState.status = 'finished';
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
            // Only update local ships from server if we are already ready OR if the server has something we don't
            if (p?.ready || (p?.ships?.length > 0 && ships.length === 0)) {
                setShips(p.ships || []);
            }
            setShots(p?.shots || []);
            setOpponentShots(op?.shots || []);
            setReady(p?.ready || false);
            setOpponentReady(op?.ready || false);
        }
    }, [state]);

    const isMyTurn = ready && opponentReady && state?.turn === (myIndex === 0 ? 'white' : 'black') && !state?.winner;
    const winnerId = state?.winner;
    const isWin = winnerId === currentUserId;

    return (
        <div className="w-full h-full flex flex-col p-1 md:p-8 space-y-1 md:space-y-6 animate-in zoom-in duration-500 overflow-y-auto overflow-x-hidden relative items-center pb-20 md:pb-8">
            {winnerId && (
                <div className="absolute inset-0 bg-bg-primary/95 backdrop-blur-xl z-[60] flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in zoom-in">
                    <div className={cn("p-8 rounded-[3rem] shadow-2xl", isWin ? "bg-emerald-500/20 border-emerald-500" : "bg-rose-500/20 border-rose-500")}>
                        <Trophy size={64} className={isWin ? "text-emerald-500 animate-bounce" : "text-slate-500"} />
                    </div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-text-main">
                        {isWin ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
                    </h2>
                    <p className="text-[10px] font-black uppercase text-text-dim tracking-widest max-w-xs leading-relaxed">
                        {isWin ? 'Вы мастерски уничтожили весь вражеский флот. Командование гордится вами!' : 'Ваш флот пошел на дно. Самое время для реванша!'}
                    </p>
                    <button onClick={onClose} className="px-10 py-4 bg-accent text-white rounded-2xl font-black uppercase text-xs">Закрыть</button>
                </div>
            )}
            
            <div className="flex flex-col md:flex-row gap-2 md:gap-12 justify-center items-center scale-[0.5] xs:scale-[0.6] sm:scale-75 md:scale-90 lg:scale-100 transform origin-top transition-transform h-min mt-1 max-w-full overflow-hidden">
                <div className="space-y-1 transform origin-center flex flex-col items-center">
                    <div className="flex items-center justify-between px-2 w-full max-w-[200px] md:max-w-none">
                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Мои Воды</p>
                        <span className="text-[10px] font-black italic text-text-main/40">{ships.length}/20</span>
                    </div>
                    <div className="grid grid-cols-10 grid-rows-10 gap-px bg-slate-200 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-800 aspect-square w-52 md:w-80 rounded-2xl overflow-hidden shadow-2xl relative">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div 
                                key={i} 
                                onClick={() => handleCellClick(i)}
                                className={cn(
                                    "bg-white dark:bg-slate-900 transition-colors relative h-full w-full",
                                    ships.includes(i) ? "bg-emerald-500 shadow-[inset_0_0_10px_rgba(16,185,129,0.5)]" : "",
                                    !ready && "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                )} 
                            >
                                {opponentShots.includes(i) && (
                                    <div className={cn("absolute inset-0 flex items-center justify-center font-bold text-[10px]", ships.includes(i) ? "text-rose-500" : "text-black/10 dark:text-white/20")}>
                                        {ships.includes(i) ? '💥' : '•'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-1 transform origin-center flex flex-col items-center">
                    <div className="flex items-center justify-between px-2 w-full max-w-[200px] md:max-w-none">
                        <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Вражеский Флот</p>
                        <span className="text-[10px] font-black italic text-text-main/40">{shots.filter(s => state?.players?.[oppIndex]?.ships?.includes(s)).length}/20</span>
                    </div>
                    <div className="grid grid-cols-10 grid-rows-10 gap-px bg-slate-200 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-800 aspect-square w-52 md:w-80 rounded-2xl overflow-hidden shadow-2xl relative">
                        {Array.from({ length: 100 }).map((_, i) => {
                            const isHit = shots.includes(i) && state?.players?.[oppIndex]?.ships?.includes(i);
                            const isMiss = shots.includes(i) && !state?.players?.[oppIndex]?.ships?.includes(i);

                            return (
                                <div 
                                    key={i} 
                                    onClick={() => handleShoot(i)}
                                    className={cn(
                                        "bg-white dark:bg-slate-900 group relative h-full w-full",
                                        isMyTurn && !shots.includes(i) && "cursor-crosshair hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    {isMyTurn && !shots.includes(i) && <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-20 transition-opacity" />}
                                    {isHit && <div className="absolute inset-0 flex items-center justify-center text-rose-500 font-bold text-[10px]">💥</div>}
                                    {isMiss && <div className="absolute inset-0 flex items-center justify-center text-black/10 dark:text-white/20 font-bold text-[10px]">•</div>}
                                </div>
                            );
                        })}
                        {!opponentReady && (
                            <div className="absolute inset-0 bg-white/60 dark:bg-bg-primary/60 backdrop-blur-md flex items-center justify-center p-8">
                                <div className="text-center space-y-2">
                                    <RefreshCw className="animate-spin text-accent mx-auto" size={24} />
                                    <p className="text-[9px] font-black uppercase text-text-main tracking-widest">Противник расставляет силы...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-1 mt-0 mb-4 md:mb-0 scale-90 sm:scale-100 pb-12 w-full max-w-sm">
                {!ready && (
                    <div className="flex flex-col items-center gap-2 w-full">
                        <div className="flex flex-wrap justify-center gap-1 md:gap-3 p-2 md:p-4 bg-bg-secondary border border-white/5 rounded-[1.5rem] md:rounded-3xl shadow-xl max-w-full">
                           {[4, 3, 2, 1].map(size => (
                               <button 
                                 key={size}
                                 onClick={() => setShipToPlace(size)}
                                 className={cn(
                                     "px-2 md:px-5 py-1.5 md:py-3 rounded-lg md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-1 md:gap-2",
                                     shipToPlace === size ? "bg-accent text-white shadow-lg" : "bg-bg-primary text-text-dim hover:text-text-main"
                                 )}
                               >
                                   <div className="hidden sm:flex gap-0.5">
                                      {Array.from({ length: size }).map((_, i) => <div key={i} className="w-1 h-1 bg-current rounded-full" />)}
                                   </div>
                                   {size}x 
                                   <span className={cn(
                                       "text-[7px] md:text-[8px] font-black",
                                       shipCounts[size as keyof typeof shipCounts] >= SHIP_LIMITS[size as keyof typeof SHIP_LIMITS] ? "text-emerald-400" : "text-text-dim"
                                   )}>
                                       {shipCounts[size as keyof typeof shipCounts]}/{SHIP_LIMITS[size as keyof typeof SHIP_LIMITS]}
                                   </span>
                                </button>
                           ))}
                           <div className="w-px h-6 md:h-8 bg-white/5 mx-0.5 md:mx-2" />
                           <button 
                             onClick={() => setOrientation(prev => prev === 'h' ? 'v' : 'h')}
                             className="px-2 md:px-5 py-1.5 md:py-3 bg-indigo-500/10 text-indigo-500 rounded-lg md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all flex items-center gap-1 md:gap-2"
                           >
                                {orientation === 'h' ? <div className="w-2 md:w-4 h-0.5 md:h-1 bg-current rounded-full" /> : <div className="w-0.5 md:w-1 h-2 md:h-4 bg-current rounded-full" />}
                                <span className="hidden xs:inline">{orientation === 'h' ? 'Гориз.' : 'Верт.'}</span>
                           </button>
                           <button 
                             onClick={() => { setShips([]); setShipCounts({ 4: 0, 3: 0, 2: 0, 1: 0 }); setShipToPlace(4); }}
                             className="px-2 md:px-5 py-1.5 md:py-3 bg-rose-500/10 text-rose-500 rounded-lg md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                           >
                                Сброс
                           </button>
                        </div>
                        <button 
                            onClick={handleReady}
                            disabled={ships.length !== 20}
                            className={cn(
                                "w-full md:w-auto px-10 py-3.5 md:py-5 rounded-xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-[11px] tracking-widest shadow-xl active:scale-95 transition-all text-white",
                                ships.length === 20 ? "bg-emerald-500 shadow-emerald-500/20" : "bg-bg-secondary/50 text-text-dim/50 cursor-not-allowed"
                            )}
                        >
                            Начать сражение (20/20)
                        </button>
                    </div>
                )}
                {ready && opponentReady && !winnerId && (
                    <div className={cn(
                        "px-10 py-5 rounded-[2.5rem] border transition-all shadow-2xl flex items-center gap-4",
                        isMyTurn ? "bg-accent/10 border-accent animate-pulse" : "bg-bg-primary/50 border-slate-800"
                    )}>
                        <div className={cn("w-3 h-3 rounded-full", isMyTurn ? "bg-accent animate-ping" : "bg-slate-600")} />
                        <p className={cn("text-[11px] font-black uppercase tracking-widest", isMyTurn ? "text-accent" : "text-text-dim")}>
                            {isMyTurn ? 'ВАШ ПРИКАЗ, КАПИТАН!' : `Ожидание огня от ${partnerName}...`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ArrowIconCustom = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);
