"use client";

import React, { useEffect, useRef } from "react";

interface Piece {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    opacity: number;
}

export default function ConfettiEffect() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pieces = useRef<Piece[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        const colors = [
            "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
            "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
            "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800",
            "#ff5722", "#10b981", "#FBBC05", "#ffffff"
        ];

        const createPiece = (x: number, y: number, side: "left" | "right" | "center") => {
            const spread = side === "left" ? 1 : side === "right" ? -1 : 0;
            return {
                x,
                y,
                w: Math.random() * 8 + 6,
                h: Math.random() * 8 + 4,
                vx: side === "center"
                    ? (Math.random() - 0.5) * 20
                    : (Math.random() * 15 + 5) * spread + (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 20 - 15,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                color: colors[Math.floor(Math.random() * colors.length)],
                opacity: 1,
            };
        };

        // Powerful bursts from sides and center
        const spawnBurst = () => {
            // Left side
            for (let i = 0; i < 80; i++) {
                pieces.current.push(createPiece(0, window.innerHeight * 0.8, "left"));
            }
            // Right side
            for (let i = 0; i < 80; i++) {
                pieces.current.push(createPiece(window.innerWidth, window.innerHeight * 0.8, "right"));
            }
            // Center
            for (let i = 0; i < 100; i++) {
                pieces.current.push(createPiece(window.innerWidth / 2, window.innerHeight * 0.7, "center"));
            }
        };

        spawnBurst();

        // Multiple bursts for a sustained, longer celebration
        const timeout1 = setTimeout(spawnBurst, 400);
        const timeout2 = setTimeout(spawnBurst, 1000);
        const timeout3 = setTimeout(spawnBurst, 1800);

        let lastTime = 0;
        let lastTimeSpawn = 0;
        let animationFrameId: number;

        const animate = (time: number) => {
            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;

            // Periodically drop a few pieces from top center to keep it feeling alive for about 4 seconds
            if (time - lastTimeSpawn > 100) {
                lastTimeSpawn = time;
                if (time < 4000) {
                    for (let i = 0; i < 3; i++) {
                        // Spawn at top slightly spread out
                        pieces.current.push(createPiece(window.innerWidth * (0.3 + Math.random() * 0.4), -20, "center"));
                    }
                }
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            pieces.current = pieces.current.filter((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.25; // Much lighter gravity, falls slower
                p.vx *= 0.985; // Air resistance
                p.rotation += p.rotationSpeed;
                p.opacity -= 0.0015; // Fades out MUCH slower

                // Keep alive longer
                if (p.opacity <= 0 || p.y > window.innerHeight + 100) return false;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;

                // Draw as more diverse shapes (squares and thin strips)
                if (Math.random() > 0.5) {
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                } else {
                    ctx.fillRect(-p.w / 4, -p.h, p.w / 2, p.h * 2);
                }
                ctx.restore();

                return true;
            });

            if (pieces.current.length > 0 || time < 4500) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            clearTimeout(timeout1);
            clearTimeout(timeout2);
            clearTimeout(timeout3);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[10000]"
        />
    );
}
