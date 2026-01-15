"use client";

import { useEffect, useRef } from "react";
import { useThemeMode } from "./theme-provider";

// Snowflake class - only instantiated when Christmas theme is active
class Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wind: number;
  opacity: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = Math.random() * 3 + 1;
    this.speed = Math.random() * 1.5 + 0.5;
    this.wind = Math.random() * 0.5 - 0.25;
    this.opacity = Math.random() * 0.5 + 0.3;
  }

  update(width: number, height: number) {
    this.y += this.speed;
    this.x += this.wind;

    if (this.y > height) {
      this.y = 0;
      this.x = Math.random() * width;
    }
    if (this.x > width) {
      this.x = 0;
    } else if (this.x < 0) {
      this.x = width;
    }

    this.wind += (Math.random() - 0.5) * 0.05;
    this.wind = Math.max(-1, Math.min(1, this.wind));
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.fill();
    ctx.closePath();
  }
}

const MAX_FLAKES = 300; // Reduced from 450 for better mobile performance

export function SnowOverlay() {
  const { theme } = useThemeMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const flakesRef = useRef<Snowflake[]>([]);

  // Early return - don't render anything if not Christmas theme
  // This completely avoids canvas creation and animation loop
  const isChristmas = theme === "christmas";

  useEffect(() => {
    // Bail out entirely if not Christmas
    if (!isChristmas) {
      flakesRef.current = []; // Clear flakes to free memory
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Initialize flakes only when needed
    if (flakesRef.current.length === 0) {
      for (let i = 0; i < MAX_FLAKES; i++) {
        flakesRef.current.push(new Snowflake(canvas.width, canvas.height));
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      flakesRef.current.forEach((flake) => {
        flake.update(canvas.width, canvas.height);
        flake.draw(ctx);
      });
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isChristmas]);

  // Don't render canvas at all if not Christmas - saves DOM node + memory
  if (!isChristmas) {
    return null;
  }

  return (
    <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" aria-hidden="true" />
  );
}
