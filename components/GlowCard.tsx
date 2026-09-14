"use client";

// A hand-built recreation of Aceternity's mouse-tracked glow-border card effect.
import { useRef, type ReactNode } from "react";
import styles from "./GlowCard.module.css";

export function GlowCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div ref={ref} onMouseMove={onMouseMove} className={`${styles.glow} ${className}`}>
      {children}
    </div>
  );
}
