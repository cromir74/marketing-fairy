"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
    life: number;
    maxLife: number;
}

export default function FairyCursor() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const mouse = useRef({ x: 0, y: 0, isActive: false });

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

        const createParticle = (x: number, y: number) => {
            // Diverse colors that work on both light and dark backgrounds
            const colors = ["#10b981", "#6ee7b7", "#34d399", "#A7F3D0", "#ffffff", "#FBBC05"];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 2.5 + 1;
            const speedX = (Math.random() - 0.5) * 1.5;
            const speedY = (Math.random() - 0.5) * 1.5;
            const life = 1;
            const maxLife = Math.random() * 0.8 + 0.4; // Seconds

            particles.current.push({ x, y, size, speedX, speedY, color, life, maxLife });
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
            mouse.current.isActive = true;

            // Spawn extra sparkles on move
            for (let i = 0; i < 3; i++) {
                createParticle(e.clientX, e.clientY);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);

        let lastTime = 0;
        const animate = (time: number) => {
            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw soft glow at cursor
            if (mouse.current.isActive) {
                const gradient = ctx.createRadialGradient(
                    mouse.current.x, mouse.current.y, 0,
                    mouse.current.x, mouse.current.y, 30
                );
                // Glow that works on both - medium intensity green
                gradient.addColorStop(0, "rgba(16, 185, 129, 0.3)");
                gradient.addColorStop(1, "rgba(16, 185, 129, 0)");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(mouse.current.x, mouse.current.y, 30, 0, Math.PI * 2);
                ctx.fill();

                // Constant trickle of sparkles
                if (Math.random() > 0.75) {
                    createParticle(mouse.current.x, mouse.current.y);
                }
            }

            // Update and draw particles
            particles.current = particles.current.filter((p) => {
                p.life -= deltaTime / p.maxLife;
                p.x += p.speedX;
                p.y += p.speedY;

                if (p.life <= 0) return false;

                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;

                // Use shadow for contrast on white without losing visibility on black
                ctx.shadowBlur = 5;
                ctx.shadowColor = "rgba(16, 185, 129, 0.5)"; // Greenish shadow works on white

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Reset shadow for the star lines
                ctx.shadowBlur = 0;

                // Star-like shine
                if (p.size > 2) {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x - p.size * 1.5, p.y);
                    ctx.lineTo(p.x + p.size * 1.5, p.y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y - p.size * 1.5);
                    ctx.lineTo(p.x, p.y + p.size * 1.5);
                    ctx.stroke();
                }

                return true;
            });

            ctx.globalAlpha = 1;
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{ mixBlendMode: "normal" }}
        />
    );
}
