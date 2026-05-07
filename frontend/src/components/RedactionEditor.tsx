'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RedactionBox } from '@/lib/security';

interface RedactionEditorProps {
  originalImage: string;
  initialBoxes: RedactionBox[];
  width: number;
  height: number;
  onSave: (boxes: RedactionBox[]) => void;
  onCancel: () => void;
}

export default function RedactionEditor({ 
  originalImage, 
  initialBoxes, 
  width, 
  height, 
  onSave, 
  onCancel 
}: RedactionEditorProps) {
  const [boxes, setBoxes] = useState<RedactionBox[]>(initialBoxes);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [displayedWidth, setDisplayedWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const scale = displayedWidth / width;

  useEffect(() => {
    const updateSize = () => {
      if (imgRef.current) {
        setDisplayedWidth(imgRef.current.clientWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [originalImage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setCurrentBox({
      x: Math.min(x, startPos.x),
      y: Math.min(y, startPos.y),
      w: Math.abs(x - startPos.x),
      h: Math.abs(y - startPos.y)
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.w > 2 && currentBox.h > 2) {
      const newBox: RedactionBox = {
        id: `manual-${Date.now()}`,
        x: currentBox.x,
        y: currentBox.y,
        width: currentBox.w,
        height: currentBox.h,
        type: 'manual'
      };
      setBoxes([...boxes, newBox]);
    }
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const removeBox = (id: string) => {
    setBoxes(boxes.filter(b => b.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <div>
          <h3 className="text-xl font-bold text-white">Privacy Editor</h3>
          <p className="text-white/60 text-sm">Review suggested redactions or drag to add your own.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setBoxes([])}
            className="px-4 py-2 text-xs font-bold text-white/70 hover:text-white transition-colors"
          >
            Clear All
          </button>
          <button 
            onClick={() => setBoxes(initialBoxes)}
            className="px-4 py-2 text-xs font-bold text-white/70 hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div 
          className="relative inline-block bg-black/40 rounded-2xl overflow-hidden border border-white/10 cursor-crosshair select-none shadow-2xl"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img 
            ref={imgRef}
            src={originalImage} 
            className="block max-w-full h-auto max-h-[70vh] pointer-events-none" 
            alt="Original" 
            onLoad={() => {
              if (imgRef.current) setDisplayedWidth(imgRef.current.clientWidth);
            }}
          />
          
          {/* Render current drawing box */}
          {currentBox && (
            <div 
              className="absolute border-2 border-[var(--color-voya-mint)] bg-[var(--color-voya-mint)]/20 rounded shadow-[0_0_10px_var(--color-voya-mint)] pointer-events-none"
              style={{
                left: `${currentBox.x * scale}px`,
                top: `${currentBox.y * scale}px`,
                width: `${currentBox.w * scale}px`,
                height: `${currentBox.h * scale}px`,
              }}
            />
          )}

          {/* Render existing boxes */}
          {boxes.map(box => (
            <div 
              key={box.id}
              className={`absolute group cursor-pointer transition-all ${
                box.type === 'suggested' 
                  ? 'bg-orange-500/40 border border-orange-500/60 hover:bg-orange-500/60' 
                  : 'bg-black/80 border border-white/20 hover:bg-black'
              }`}
              style={{
                left: `${box.x * scale}px`,
                top: `${box.y * scale}px`,
                width: `${box.width * scale}px`,
                height: `${box.height * scale}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                removeBox(box.id);
              }}
            >
            <div className="hidden group-hover:flex absolute -top-6 left-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              Remove
            </div>
            {box.type === 'suggested' && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white uppercase tracking-tighter pointer-events-none opacity-40">PII</span>
            )}
          </div>
        ))}
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={onCancel}
          className="flex-1 py-4 rounded-xl border border-white/20 text-white font-bold hover:bg-white/5 transition-all"
        >
          Cancel
        </button>
        <button 
          onClick={() => onSave(boxes)}
          className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-[var(--color-voya-mint)] to-[var(--color-voya-light)] text-white font-bold shadow-lg hover:shadow-[var(--color-voya-mint)]/40 transition-all flex justify-center items-center gap-2"
        >
          Confirm Redactions & Continue
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </div>
  );
}
