"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pencil,
  Eraser,
  Square,
  Circle,
  Download,
  Trash2,
  Palette,
} from "lucide-react";

type Tool = "pen" | "rect" | "circle" | "eraser";
type Stroke =
  | {
      tool: "pen" | "eraser";
      color: string;
      size: number;
      points: Array<{ x: number; y: number }>;
    }
  | {
      tool: "rect" | "circle";
      color: string;
      size: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };

const COLORS = ["#06B6D4", "#22C55E", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#1A1A2E"];

interface Props {
  initialStrokes?: Stroke[];
  onChange?: (strokes: Stroke[]) => void;
  height?: number;
}

export function WhiteboardCanvas({ initialStrokes, onChange, height = 360 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes ?? []);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#06B6D4");
  const [size, setSize] = useState(3);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.fillStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "pen" || stroke.tool === "eraser") {
        if (stroke.points.length === 0) continue;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (const p of stroke.points) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (stroke.tool === "rect") {
        ctx.strokeRect(
          Math.min(stroke.x1, stroke.x2),
          Math.min(stroke.y1, stroke.y2),
          Math.abs(stroke.x2 - stroke.x1),
          Math.abs(stroke.y2 - stroke.y1),
        );
      } else if (stroke.tool === "circle") {
        const cx = (stroke.x1 + stroke.x2) / 2;
        const cy = (stroke.y1 + stroke.y2) / 2;
        const rx = Math.abs(stroke.x2 - stroke.x1) / 2;
        const ry = Math.abs(stroke.y2 - stroke.y1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }, [strokes]);

  useEffect(() => {
    redraw();
    onChange?.(strokes);
  }, [strokes, redraw, onChange]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = getPos(e);
    startRef.current = p;

    if (tool === "pen" || tool === "eraser") {
      setStrokes((prev) => [
        ...prev,
        { tool, color, size, points: [p] },
      ]);
    } else {
      setStrokes((prev) => [
        ...prev,
        { tool, color, size, x1: p.x, y1: p.y, x2: p.x, y2: p.y },
      ]);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const p = getPos(e);
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.tool === "pen" || last.tool === "eraser") {
        const updated: Stroke = {
          tool: last.tool,
          color: last.color,
          size: last.size,
          points: [...last.points, p],
        };
        return [...prev.slice(0, -1), updated];
      }
      const updated: Stroke = {
        tool: last.tool,
        color: last.color,
        size: last.size,
        x1: last.x1,
        y1: last.y1,
        x2: p.x,
        y2: p.y,
      };
      return [...prev.slice(0, -1), updated];
    });
  }

  function onPointerUp() {
    drawingRef.current = false;
    startRef.current = null;
  }

  function clear() {
    setStrokes([]);
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div
      style={{
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        background: "#ffffff",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 6px",
          borderRadius: 8,
          background: "var(--content-secondary)",
          flexWrap: "wrap",
        }}
      >
        {([
          ["pen", Pencil],
          ["rect", Square],
          ["circle", Circle],
          ["eraser", Eraser],
        ] as const).map(([t, Icon]) => (
          <button
            key={t}
            type="button"
            aria-label={t}
            aria-pressed={tool === t ? "true" : "false"}
            onClick={() => setTool(t)}
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: tool === t ? "rgba(6, 182, 212,0.12)" : "transparent",
              color: tool === t ? "var(--vyne-purple)" : "var(--text-secondary)",
            }}
          >
            <Icon size={14} />
          </button>
        ))}

        <span
          style={{
            width: 1,
            alignSelf: "stretch",
            background: "var(--content-border)",
            margin: "0 4px",
          }}
        />

        <Palette size={13} style={{ color: "var(--text-tertiary)" }} />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            aria-pressed={color === c ? "true" : "false"}
            onClick={() => setColor(c)}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: color === c ? "2px solid var(--text-primary)" : "2px solid transparent",
              background: c,
              cursor: "pointer",
            }}
          />
        ))}

        <input
          type="range"
          min={1}
          max={20}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          aria-label="Brush size"
          style={{ width: 80, accentColor: "#06B6D4" }}
        />

        <div style={{ flex: 1 }} />

        <button
          type="button"
          aria-label="Clear board"
          onClick={clear}
          style={{
            width: 28,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "var(--status-danger)",
          }}
        >
          <Trash2 size={14} />
        </button>
        <button
          type="button"
          aria-label="Export PNG"
          onClick={exportPng}
          style={{
            width: 28,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "var(--text-secondary)",
          }}
        >
          <Download size={14} />
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={height * 2}
        aria-label="Whiteboard"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          width: "100%",
          height,
          borderRadius: 6,
          background: "#ffffff",
          cursor: tool === "eraser" ? "cell" : "crosshair",
          border: "1px solid var(--content-border)",
          touchAction: "none",
        }}
      />
    </div>
  );
}
