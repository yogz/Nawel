"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeMode } from "./theme-provider";

// Moved outside component to avoid recreation on every render
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
    this.speed = Math.random() * 1.5 + 0.5; // Slightly faster fall
    this.wind = Math.random() * 0.5 - 0.25;
    this.opacity = Math.random() * 0.5 + 0.3; // More visible
  }

  update(width: number, height: number) {
    this.y += this.speed;
    this.x += this.wind;

    // Wrap around logic
    if (this.y > height) {
      this.y = 0;
      this.x = Math.random() * width;
    }
    if (this.x > width) {
      this.x = 0;
    } else if (this.x < 0) {
      this.x = width;
    }

    // Creating a slight sway
    this.wind += (Math.random() - 0.5) * 0.05;
    // Limit max wind
    if (this.wind > 1) {
      this.wind = 1;
    }
    if (this.wind < -1) {
      this.wind = -1;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.fill();
    ctx.closePath();
  }
}

export function SnowOverlay() {
  const { theme } = useThemeMode();
  const [isActive, setIsActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update active state when theme changes
  useEffect(() => {
    setIsActive(theme === "christmas");
  }, [theme]);

  const requestRef = useRef<number | undefined>(undefined);
  const flakesRef = useRef<Snowflake[]>([]);
  const MAX_FLAKES = 450; // Increased from 300

  // Track active state in ref to avoid effect re-runs
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Initialize flakes if empty
    if (flakesRef.current.length === 0) {
      const flakes: Snowflake[] = [];
      for (let i = 0; i < MAX_FLAKES; i++) {
        flakes.push(new Snowflake(canvas.width, canvas.height));
      }
      flakesRef.current = flakes;
    }

    const animate = () => {
      // Always clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isActiveRef.current) {
        flakesRef.current.forEach((flake) => {
          flake.update(canvas.width, canvas.height);
          flake.draw(ctx);
        });
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []); // Run once on mount

  return (
    <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" aria-hidden="true" />
  );
}
