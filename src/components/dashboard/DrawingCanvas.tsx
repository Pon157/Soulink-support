import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Paintbrush, Square, Circle, Download, Trash2, X, Check } from 'lucide-react';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const DrawingCanvas = ({ onSave, onCancel }: { onSave: (url: string) => void, onCancel: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set initial size
    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = 300;
    
    // Initial background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#1e293b' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const save = () => {
    const url = canvasRef.current?.toDataURL('image/png');
    if (url) onSave(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1e293b] rounded-3xl overflow-hidden border border-slate-800 touch-none">
        <canvas 
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair w-full"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between p-2">
        <div className="flex gap-2">
          <button onClick={() => setTool('brush')} className={cn("p-3 rounded-2xl transition-all", tool === 'brush' ? "bg-accent text-white" : "bg-bg-secondary text-text-dim")}><Paintbrush size={20} /></button>
          <button onClick={() => setTool('eraser')} className={cn("p-3 rounded-2xl transition-all", tool === 'eraser' ? "bg-accent text-white" : "bg-bg-secondary text-text-dim")}><Eraser size={20} /></button>
          <button onClick={clear} className="p-3 rounded-2xl bg-bg-secondary text-rose-400"><Trash2 size={20} /></button>
        </div>
        
        <input 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer"
        />
        
        <div className="flex-1 max-w-[100px]">
          <input 
            type="range" 
            min="1" 
            max="50" 
            value={brushSize} 
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={onCancel} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-bg-secondary text-text-dim">Отмена</button>
        <button onClick={save} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-accent text-white">Сохранить</button>
      </div>
    </div>
  );
};
