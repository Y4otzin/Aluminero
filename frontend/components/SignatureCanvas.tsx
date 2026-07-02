'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { Eraser, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SignatureCanvasProps {
  onSave: (base64: string) => void;
  savedSignature?: string | null;
}

export default function SignatureCanvas({ onSave, savedSignature }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(500);
  const [hasSignature, setHasSignature] = useState(false);
  const [saved, setSaved] = useState(false);

  // Responsive: ajustar canvas al ancho del contenedor
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setCanvasWidth(Math.min(w, 600));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Inicializar Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const height = Math.max(200, Math.round(canvasWidth * 0.35));

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
      selection: false,
    });

    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = '#1e293b';
    canvas.freeDrawingBrush.width = 2;

    // Línea base decorativa
    const line = new fabric.Line([20, height - 30, canvasWidth - 20, height - 30], {
      stroke: '#cbd5e1',
      strokeWidth: 1,
      strokeDashArray: [4, 3],
      selectable: false,
      evented: false,
    });
    canvas.add(line);

    // Texto de ayuda
    const hint = new fabric.Text('Dibuja tu firma aquí', {
      left: canvasWidth / 2,
      top: height / 2 - 10,
      fontSize: 16,
      fill: '#94a3b8',
      fontFamily: 'Inter, sans-serif',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    canvas.add(hint);
    hint.visible = true;

    canvas.on('path:created', () => {
      hint.visible = false;
      canvas.renderAll();
      setHasSignature(true);
    });

    canvas.on('mouse:down', () => {
      hint.visible = false;
      canvas.renderAll();
    });

    fabricRef.current = canvas;

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [canvasWidth]);

  // Limpiar canvas
  const handleClear = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const height = canvas.getHeight();

    // Eliminar todos los paths
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if (obj.type === 'path') canvas.remove(obj);
    });

    // Restaurar hint
    const hint = objects.find((o) => o.type === 'text');
    if (hint) hint.visible = true;

    canvas.renderAll();
    setHasSignature(false);
    setSaved(false);
  }, []);

  // Guardar firma como base64
  const handleSave = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    // Verificar que haya algo dibujado
    const hasPath = canvas.getObjects().some((o) => o.type === 'path');
    if (!hasPath) return;

    // Capturar solo la parte dibujada (recortar)
    const base64 = canvas.toDataURL({
      format: 'png',
      multiplier: 2, // retina
    });

    onSave(base64);
    setSaved(true);

    // Reset saved state after 3s
    setTimeout(() => setSaved(false), 3000);
  }, [onSave]);

  return (
    <div className="space-y-4">
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white hover:border-[#1e40af]/40 transition-colors duration-200"
      >
        <canvas ref={canvasRef} className="touch-none w-full" />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Eraser className="w-4 h-4" />}
          onClick={handleClear}
          disabled={!hasSignature}
        >
          Limpiar
        </Button>
        <Button
          variant="primary"
          size="sm"
          leftIcon={saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          onClick={handleSave}
          disabled={!hasSignature}
          className={saved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          {saved ? '¡Firma guardada!' : 'Guardar firma'}
        </Button>
      </div>

      {/* Preview de firma guardada */}
      {savedSignature && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Vista previa
          </p>
          <div className="inline-flex border border-gray-200 rounded-lg p-2 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={savedSignature}
              alt="Vista previa de la firma"
              className="h-12 w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
