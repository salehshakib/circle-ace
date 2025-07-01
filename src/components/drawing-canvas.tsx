"use client";

import { useRef, useEffect, useState, useCallback } from "react";

type DrawingCanvasProps = {
  targetCircle: { x: number; y: number; radius: number };
  onDrawEnd: (dataUri: string) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
};

export function DrawingCanvas({
  targetCircle,
  onDrawEnd,
  width = 600,
  height = 600,
  disabled = false,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [path, setPath] = useState<[number, number][]>([]);

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas?.getContext("2d");
  }, []);

  const draw = useCallback(() => {
    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw target circle
    ctx.strokeStyle = "hsla(var(--accent) / 0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(targetCircle.x, targetCircle.y, targetCircle.radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw user's path
    if (path.length > 1) {
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0], path[i][1]);
      }
      ctx.stroke();
    }
  }, [getCanvasContext, path, targetCircle, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (canvas && ctx) {
      // Set background color of canvas
      ctx.fillStyle = "hsl(var(--background))";
      ctx.fillRect(0, 0, width, height);
      draw();
    }
  }, [draw, getCanvasContext, height, width]);

  useEffect(() => {
    setPath([]);
  }, [targetCircle]);

  const getCoords = (event: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    event.preventDefault();
    const { x, y } = getCoords(event);
    setIsDrawing(true);
    setPath([[x, y]]);
  };

  const continueDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    event.preventDefault();
    const { x, y } = getCoords(event);
    setPath((prevPath) => [...prevPath, [x, y]]);
  };

  const stopDrawing = useCallback(() => {
    if (!isDrawing || disabled) return;
    setIsDrawing(false);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportCtx = exportCanvas.getContext('2d');
    
    if (exportCtx && path.length > 1) {
        exportCtx.fillStyle = "#FFFFFF";
        exportCtx.fillRect(0, 0, width, height);
        exportCtx.strokeStyle = "#000000";
        exportCtx.lineWidth = 5;
        exportCtx.lineCap = "round";
        exportCtx.lineJoin = "round";
        exportCtx.beginPath();
        exportCtx.moveTo(path[0][0], path[0][1]);
        for (let i = 1; i < path.length; i++) {
            exportCtx.lineTo(path[i][0], path[i][1]);
        }
        exportCtx.stroke();
        const dataUri = exportCanvas.toDataURL("image/png");
        onDrawEnd(dataUri);
    } else {
        // If path is too short, don't submit, just clear
        setPath([]);
    }
  }, [isDrawing, disabled, path, width, height, onDrawEnd]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded-xl border-2 border-primary/10 shadow-lg touch-none ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
      onMouseDown={startDrawing}
      onMouseMove={continueDrawing}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={continueDrawing}
      onTouchEnd={stopDrawing}
    />
  );
}
