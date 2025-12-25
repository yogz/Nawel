"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeMode } from "@/components/theme-provider";

export function SnowOverlay() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const { christmas } = useThemeMode();
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const requestRef = useRef<number | undefined>(undefined);
    const snowFlakesRef = useRef<Snowflake[]>([]);
    const accumulationRef = useRef<number[]>([]);

    // Configuration
    const IDLE_THRESHOLD = 10000; // 10 seconds of inactivity to start
    const MAX_FLAKES = 450; // Increased from 300

    class Snowflake {
        x: number;
        y: number;
        radius: number;
        speed: number;
        wind: number;
        opacity: number;

        constructor(width: number, height: number) {
            this.x = Math.random() * width;
            this.y = -10; // Start slightly above viewport
            this.radius = Math.random() * 4 + 2; // Increased size: 2-6px
            this.speed = Math.random() * 2 + 1; // Faster fall
            this.wind = Math.random() * 2 - 1;
            this.opacity = Math.random() * 0.4 + 0.6; // Higher opacity: 0.6-1.0
        }

        update(height: number, width: number) {
            this.y += this.speed;
            this.x += Math.sin(this.y * 0.01) + this.wind;

            // Wrap around horizontally
            if (this.x > width) this.x = 0;
            if (this.x < 0) this.x = width;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    // Track active state in ref to avoid effect re-runs
    const isActiveRef = useRef(isActive);
    useEffect(() => {
        isActiveRef.current = isActive;
    }, [isActive]);

    // Idle detection
    useEffect(() => {
        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "touchmove", "click"];

        const resetIdleTimer = () => {
            // Use ref to check current state without re-binding listeners
            if (isActiveRef.current) {
                setIsActive(false);
            }

            // Clear existing timer
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }

            // Start new timer
            idleTimerRef.current = setTimeout(() => {
                setIsActive(true);
            }, IDLE_THRESHOLD);
        };

        // Initialize timer on mount
        resetIdleTimer();

        // Attach listeners
        events.forEach((event) => {
            window.addEventListener(event, resetIdleTimer, { passive: true });
        });

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            events.forEach((event) => {
                window.removeEventListener(event, resetIdleTimer);
            });
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []); // Empty dependency array to run only once!

    // Snow animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const updateCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Reset accumulation array on resize
            accumulationRef.current = new Array(Math.ceil(window.innerWidth)).fill(window.innerHeight);
        };

        // Initial size
        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);

        // Initialize accumulation capability if needed
        if (accumulationRef.current.length === 0) {
            accumulationRef.current = new Array(Math.ceil(window.innerWidth)).fill(window.innerHeight);
        }

        const animate = () => {
            if (!isActive) {
                // Clear canvas and stop animation when not active
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                snowFlakesRef.current = [];
                accumulationRef.current = new Array(Math.ceil(window.innerWidth)).fill(window.innerHeight);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Add new flake occasionally
            if (snowFlakesRef.current.length < MAX_FLAKES && Math.random() < 0.2) {
                snowFlakesRef.current.push(new Snowflake(canvas.width, canvas.height));
            }

            // Draw accumulated snow
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            for (let x = 0; x < canvas.width; x += 5) { // Optimization: step by 5
                const index = Math.floor(x);
                if (index < accumulationRef.current.length) {
                    const height = accumulationRef.current[index];
                    if (height < canvas.height) {
                        ctx.lineTo(x, height);
                    } else {
                        ctx.lineTo(x, canvas.height);
                    }
                }
            }
            ctx.lineTo(canvas.width, canvas.height);
            ctx.fill();


            // Update and draw flakes
            for (let i = snowFlakesRef.current.length - 1; i >= 0; i--) {
                const flake = snowFlakesRef.current[i];
                flake.update(canvas.height, canvas.width);

                // Simple accumulation logic
                const xIndex = Math.floor(flake.x);
                if (xIndex >= 0 && xIndex < accumulationRef.current.length) {
                    // Check if it hit the pile
                    if (flake.y + flake.radius >= accumulationRef.current[xIndex]) {
                        // Pile up!
                        // Raise the ground level around impact
                        const impactWidth = 15;
                        for (let j = xIndex - impactWidth; j < xIndex + impactWidth; j++) {
                            if (j >= 0 && j < accumulationRef.current.length) {
                                // Rise by a fraction of radius, sinusoidal shape
                                const distance = Math.abs(xIndex - j);
                                const rise = Math.cos((distance / impactWidth) * (Math.PI / 2)) * 0.8;
                                accumulationRef.current[j] -= Math.max(0, rise);
                            }
                        }

                        // Remove flake
                        snowFlakesRef.current.splice(i, 1);
                        continue;
                    }
                }

                // Remove if off screen (shouldn't happen with accumulation but fail safe)
                if (flake.y > canvas.height) {
                    snowFlakesRef.current.splice(i, 1);
                    continue;
                }

                flake.draw(ctx);
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        if (isActive) {
            animate();
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => {
            window.removeEventListener("resize", updateCanvasSize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isActive, christmas]);

    return christmas ? (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 z-[100] pointer-events-none transition-all duration-1000 ${isActive ? "opacity-100 bg-black/40" : "opacity-0"
                }`}
        />
    ) : null;
}
