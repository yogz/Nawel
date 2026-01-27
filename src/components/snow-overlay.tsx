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
  // Christmas theme is removed, so this is disabled.
  return null;
}
