"use client";

import { useState, useEffect, useCallback } from "react";
import { RoughCanvas } from "roughjs/bin/canvas";

/**
 * SketchViewer — muestra un boceto SVG generado por el backend
 * Reemplaza al antiguo RenderViewer que dependía de OpenAI/FAL.
 *
 * Flujo:
 *   1. El padre pasa `canvasState` (JSON del diseño Fabric.js)
 *   2. SketchViewer hace POST a /api/v1/sketch
 *   3. Recibe el SVG y lo muestra en un <img> o incrustado
 *   4. Opcional: aplica roughjs para efecto "a mano alzada"
 */

interface SketchElement {
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  [key: string]: unknown;
}

interface SketchViewerProps {
  canvasState: SketchElement[];
  width?: number;
  height?: number;
  style?: "clean" | "hand-drawn";
  className?: string;
}

export default function SketchViewer({
  canvasState,
  width = 800,
  height = 600,
  style = "hand-drawn",
  className = "",
}: SketchViewerProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSketch = useCallback(async () => {
    if (!canvasState || canvasState.length === 0) {
      setError("No hay elementos para dibujar");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const resp = await fetch(`${apiUrl}/api/v1/sketch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elements: canvasState,
          width,
          height,
          style,
        }),
      });
      if (!resp.ok) {
        throw new Error(`Error del servidor: ${resp.status}`);
      }
      const svgText = await resp.text();
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      setSvgContent(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [canvasState, width, height, style]);

  useEffect(() => {
    generateSketch();
  }, [generateSketch]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 border border-gray-200 rounded ${className}`}
        style={{ height }}
      >
        <div className="text-gray-400 animate-pulse">Generando boceto...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded ${className}`}
        style={{ height }}
      >
        <p className="text-red-600">{error}</p>
        <button
          onClick={generateSketch}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!svgContent) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={svgContent}
        alt="Boceto del diseño"
        className="w-full h-auto"
        style={{ maxWidth: width, maxHeight: height }}
      />
    </div>
  );
}
