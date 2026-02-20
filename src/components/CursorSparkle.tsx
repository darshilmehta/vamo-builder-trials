"use client";

import { useRef, useEffect, useCallback } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    type: "emoji" | "dot";
    emoji?: string;
    hue: number;
}

const PINEAPPLE_EMOJIS = ["🍍"];
const SPAWN_RATE = 3;

export function CursorSparkle({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({ x: 0, y: 0, active: false, lastX: 0, lastY: 0 });
    const animRef = useRef<number>(0);

    const spawnParticle = useCallback((x: number, y: number) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        const maxLife = 30 + Math.random() * 40;

        particlesRef.current.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            life: maxLife,
            maxLife,
            size: 14 + Math.random() * 10,
            type: "emoji" as const,
            emoji: "🍍",
            hue: 30,
        });
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + "px";
            canvas.style.height = rect.height + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener("resize", resize);

        const onMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
                mouseRef.current.lastX = mouseRef.current.x;
                mouseRef.current.lastY = mouseRef.current.y;
                mouseRef.current.x = x;
                mouseRef.current.y = y;
                mouseRef.current.active = true;
            } else {
                mouseRef.current.active = false;
            }
        };
        const onMouseLeave = () => { mouseRef.current.active = false; };

        container.addEventListener("mousemove", onMouseMove);
        container.addEventListener("mouseleave", onMouseLeave);

        const tick = () => {
            const rect = container.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            const mouse = mouseRef.current;

            // Spawn new particles if mouse is moving
            if (mouse.active) {
                const dx = mouse.x - mouse.lastX;
                const dy = mouse.y - mouse.lastY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 2) {
                    for (let i = 0; i < SPAWN_RATE; i++) {
                        spawnParticle(
                            mouse.x + (Math.random() - 0.5) * 10,
                            mouse.y + (Math.random() - 0.5) * 10
                        );
                    }
                }
            }

            // Update & draw particles
            const alive: Particle[] = [];
            for (const p of particlesRef.current) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.03; // slight gravity
                p.vx *= 0.99;
                p.life -= 1;

                if (p.life <= 0) continue;

                const alpha = p.life / p.maxLife;
                const scale = 0.5 + alpha * 0.5;

                ctx.save();
                ctx.globalAlpha = alpha;

                if (p.emoji) {
                    ctx.font = `${p.size * scale}px serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(p.emoji, p.x, p.y);
                }

                ctx.restore();
                alive.push(p);
            }
            particlesRef.current = alive;

            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener("resize", resize);
            container.removeEventListener("mousemove", onMouseMove);
            container.removeEventListener("mouseleave", onMouseLeave);
        };
    }, [containerRef, spawnParticle]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 pointer-events-none"
        />
    );
}
