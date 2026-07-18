import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Trash2, Cpu, HelpCircle } from 'lucide-react';

interface DrawingCanvasProps {
  onDraw: (pixels: number[]) => void;
  isModelReady: boolean;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onDraw, isModelReady }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [brushSize, setBrushSize] = useState(16);
  const [autoInfer, setAutoInfer] = useState(true);

  // Use refs for stable references inside callbacks
  const brushSizeRef = useRef(brushSize);
  const autoInferRef = useRef(autoInfer);
  const isModelReadyRef = useRef(isModelReady);
  const onDrawRef = useRef(onDraw);

  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { autoInferRef.current = autoInfer; }, [autoInfer]);
  useEffect(() => { isModelReadyRef.current = isModelReady; }, [isModelReady]);
  useEffect(() => { onDrawRef.current = onDraw; }, [onDraw]);

  // Set up canvases — only fills background, does NOT run inference on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Prevent default touch scrolling when drawing on touch screens
    const preventDefault = (e: TouchEvent) => {
      if (e.target === canvas) e.preventDefault();
    };
    document.body.addEventListener('touchstart', preventDefault, { passive: false });
    document.body.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.body.removeEventListener('touchstart', preventDefault);
      document.body.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  // Convert main canvas (280x280) to 28x28 preview and extract pixel array
  const updatePreview = useCallback(() => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!canvas || !previewCanvas) return null;
    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) return null;
    previewCtx.fillStyle = '#000000';
    previewCtx.fillRect(0, 0, 28, 28);
    previewCtx.drawImage(canvas, 0, 0, 28, 28);
    return previewCtx.getImageData(0, 0, 28, 28);
  }, []);

  // MNIST preprocessing: center + scale to match training data distribution.
  // MNIST digits are always tightly centered in a 20x20 region inside 28x28.
  // Without this step the model sees off-center/oversized inputs → wrong guesses.
  const centerAndScale = (raw: number[]): number[] => {
    let minR = 28, maxR = -1, minC = 28, maxC = -1;
    for (let r = 0; r < 28; r++) {
      for (let c = 0; c < 28; c++) {
        if (raw[r * 28 + c] > 0.05) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }
    if (maxR < 0) return raw; // blank canvas

    const h = maxR - minR + 1;
    const w = maxC - minC + 1;
    const TARGET = 20; // MNIST digits fill ~20x20 in 28x28

    // Build src canvas from bounding box
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w; srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext('2d')!;
    const srcImg = srcCtx.createImageData(w, h);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const v = Math.round(raw[(minR + r) * 28 + (minC + c)] * 255);
        const i = (r * w + c) * 4;
        srcImg.data[i] = v; srcImg.data[i+1] = v;
        srcImg.data[i+2] = v; srcImg.data[i+3] = 255;
      }
    }
    srcCtx.putImageData(srcImg, 0, 0);

    // Scale to TARGET and center in 28x28
    const scale = TARGET / Math.max(w, h);
    const dstW = Math.round(w * scale);
    const dstH = Math.round(h * scale);
    const dstX = Math.round((28 - dstW) / 2);
    const dstY = Math.round((28 - dstH) / 2);

    const out = document.createElement('canvas');
    out.width = 28; out.height = 28;
    const outCtx = out.getContext('2d')!;
    outCtx.fillStyle = '#000';
    outCtx.fillRect(0, 0, 28, 28);
    outCtx.drawImage(srcCanvas, 0, 0, w, h, dstX, dstY, dstW, dstH);

    // Update the preview canvas too so "What the AI sees" shows centered version
    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      if (pCtx) {
        pCtx.fillStyle = '#000';
        pCtx.fillRect(0, 0, 28, 28);
        pCtx.drawImage(out, 0, 0);
      }
    }

    const processed = outCtx.getImageData(0, 0, 28, 28).data;
    const result = new Array(784);
    for (let i = 0; i < 784; i++) result[i] = processed[i * 4] / 255;
    return result;
  };

  const triggerInference = useCallback(() => {
    if (!isModelReadyRef.current) return;
    const imgData = updatePreview();
    if (!imgData) return;
    const data = imgData.data;
    const rawPixels = new Array(784);
    for (let i = 0; i < 784; i++) rawPixels[i] = data[i * 4] / 255;
    // Preprocess to match MNIST distribution before sending to model
    const pixels = centerAndScale(rawPixels);
    onDrawRef.current(pixels);
  }, [updatePreview]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updatePreview();
    triggerInference();
  }, [updatePreview, triggerInference]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    setIsDrawing(true);
    setLastPos(coords);
    // Draw a dot at the click position
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, brushSizeRef.current / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    updatePreview();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = brushSizeRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setLastPos(coords);
    updatePreview();
    if (autoInferRef.current) {
      triggerInference();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      triggerInference();
    }
  };

  // Keyboard shortcuts — stable because we use refs, not deps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        clearCanvas();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerInference();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearCanvas, triggerInference]);

  return (
    <div className="glass-panel rounded-2xl p-6 glow-border flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>Draw a Number Here</span>
          <span className="text-xs bg-[#00d9ff]/20 text-[#00d9ff] px-2 py-0.5 rounded-full border border-[#00d9ff]/30 font-medium">
            0 – 9
          </span>
        </h2>
        <div className="group relative">
          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#00d9ff] cursor-pointer transition-colors" />
          <div className="absolute right-0 top-6 hidden group-hover:block z-50 w-64 p-3 bg-[#0d0d0d] text-xs text-gray-300 rounded-lg border border-gray-800 shadow-xl">
            Use your mouse or finger to draw a single number from 0 to 9. The AI will try to guess what you drew!
          </div>
        </div>
      </div>

      {/* Main Drawing Canvas */}
      <div className="relative w-full max-w-[280px] aspect-square rounded-xl overflow-hidden border border-gray-800 focus-within:border-[#00d9ff] transition-all bg-black shadow-inner shadow-black/80">
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair block no-select touch-none"
        />

        {/* Real-time MNIST Downscaled Preview */}
        <div className="absolute bottom-2 right-2 border border-gray-800 rounded bg-black/90 p-1 flex flex-col items-center shadow-md">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">What the AI sees</span>
          <canvas
            ref={previewCanvasRef}
            width={28}
            height={28}
            className="w-14 h-14 border border-gray-900 bg-black block"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>

      {/* Brush Size & Controls */}
      <div className="w-full mt-4 space-y-4">
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Pen Thickness</span>
            <span className="text-[#00d9ff]">{brushSize}px</span>
          </div>
          <input
            type="range"
            min={10}
            max={32}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#00d9ff]"
          />
        </div>

        <div className="flex items-center justify-between border-t border-gray-800/80 pt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoInfer}
              onChange={(e) => setAutoInfer(e.target.checked)}
              className="rounded border-gray-800 text-[#00d9ff] focus:ring-[#00d9ff] focus:ring-offset-0 bg-[#0d0d0d]"
            />
            <span className="text-xs text-gray-400">Guess as I draw</span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] border border-gray-800 hover:border-red-500/50 rounded-lg text-xs text-gray-300 hover:text-red-400 transition-all font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              onClick={triggerInference}
              disabled={!isModelReady}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isModelReady
                  ? 'bg-[#00d9ff] text-black hover:bg-[#00d9ff]/90 shadow-md shadow-[#00d9ff]/10 hover:shadow-[#00d9ff]/20'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Guess Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
