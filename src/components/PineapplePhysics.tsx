"use client";

import { useRef, useEffect, useCallback } from "react";

interface Pineapple {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    rotation: number;
    rotationV: number;
    // each pineapple has its own drift phase for organic floating
    phaseX: number;
    phaseY: number;
    driftSpeed: number;
}

const COUNT = 18;
const DAMPING = 0.99;
const BOUNCE = 0.5;
const GRAB_DIST = 50;
const DRIFT_STRENGTH = 0.008; // gentle sinusoidal nudge

export function PineapplePhysics() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pinesRef = useRef<Pineapple[]>([]);
    const mouseRef = useRef({ x: 0, y: 0, px: 0, py: 0, down: false, grabbed: -1 });
    const animRef = useRef<number>(0);
    const sizeRef = useRef({ w: 0, h: 0 });
    const frameRef = useRef(0);

    const initPineapples = useCallback((w: number, h: number) => {
        const pines: Pineapple[] = [];
        for (let i = 0; i < COUNT; i++) {
            pines.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                r: 18 + Math.random() * 14,
                rotation: Math.random() * Math.PI * 2,
                rotationV: (Math.random() - 0.5) * 0.02,
                phaseX: Math.random() * Math.PI * 2,
                phaseY: Math.random() * Math.PI * 2,
                driftSpeed: 0.005 + Math.random() * 0.01,
            });
        }
        pinesRef.current = pines;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + "px";
            canvas.style.height = window.innerHeight + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            sizeRef.current = { w: window.innerWidth, h: window.innerHeight };
            if (pinesRef.current.length === 0) {
                initPineapples(window.innerWidth, window.innerHeight);
            }
        };
        resize();
        window.addEventListener("resize", resize);

        const tick = () => {
            const { w, h } = sizeRef.current;
            const pines = pinesRef.current;
            const mouse = mouseRef.current;
            frameRef.current++;
            const frame = frameRef.current;
            ctx.clearRect(0, 0, w, h);

            // Update physics
            for (let i = 0; i < pines.length; i++) {
                const p = pines[i];

                if (mouse.down && mouse.grabbed === i) {
                    p.x = mouse.x;
                    p.y = mouse.y;
                    p.vx = (mouse.x - mouse.px) * 0.5;
                    p.vy = (mouse.y - mouse.py) * 0.5;
                } else {
                    // Gentle sinusoidal drift instead of gravity — true floating
                    p.vx += Math.sin(frame * p.driftSpeed + p.phaseX) * DRIFT_STRENGTH;
                    p.vy += Math.cos(frame * p.driftSpeed + p.phaseY) * DRIFT_STRENGTH;

                    p.vx *= DAMPING;
                    p.vy *= DAMPING;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.rotation += p.rotationV;

                    // Bounce off walls
                    if (p.x - p.r < 0) { p.x = p.r; p.vx = Math.abs(p.vx) * BOUNCE; }
                    if (p.x + p.r > w) { p.x = w - p.r; p.vx = -Math.abs(p.vx) * BOUNCE; }
                    if (p.y - p.r < 0) { p.y = p.r; p.vy = Math.abs(p.vy) * BOUNCE; }
                    if (p.y + p.r > h) { p.y = h - p.r; p.vy = -Math.abs(p.vy) * BOUNCE; }
                }

                // Collisions
                for (let j = i + 1; j < pines.length; j++) {
                    const q = pines[j];
                    const dx = q.x - p.x;
                    const dy = q.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = p.r + q.r;
                    if (dist < minDist && dist > 0) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const overlap = (minDist - dist) * 0.5;
                        p.x -= nx * overlap;
                        p.y -= ny * overlap;
                        q.x += nx * overlap;
                        q.y += ny * overlap;
                        const dvx = p.vx - q.vx;
                        const dvy = p.vy - q.vy;
                        const dot = dvx * nx + dvy * ny;
                        if (dot > 0) {
                            p.vx -= dot * nx * 0.5;
                            p.vy -= dot * ny * 0.5;
                            q.vx += dot * nx * 0.5;
                            q.vy += dot * ny * 0.5;
                        }
                    }
                }
            }

            // Draw
            for (const p of pines) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.font = `${p.r * 1.5}px serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.globalAlpha = 0.7;
                ctx.fillText("🍍", 0, 0);
                ctx.restore();
            }

            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);

        // Mouse/touch events
        const getPos = (e: MouseEvent | Touch) => ({ x: e.clientX, y: e.clientY });

        const onDown = (x: number, y: number) => {
            const mouse = mouseRef.current;
            mouse.down = true;
            mouse.x = x;
            mouse.y = y;
            mouse.px = x;
            mouse.py = y;
            let closest = -1;
            let closestDist = GRAB_DIST;
            for (let i = 0; i < pinesRef.current.length; i++) {
                const p = pinesRef.current[i];
                const d = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
                if (d < closestDist) {
                    closestDist = d;
                    closest = i;
                }
            }
            mouse.grabbed = closest;
        };

        const onMove = (x: number, y: number) => {
            const mouse = mouseRef.current;
            mouse.px = mouse.x;
            mouse.py = mouse.y;
            mouse.x = x;
            mouse.y = y;
        };

        const onUp = () => {
            mouseRef.current.down = false;
            mouseRef.current.grabbed = -1;
        };

        const handleMouseDown = (e: MouseEvent) => { const p = getPos(e); onDown(p.x, p.y); };
        const handleMouseMove = (e: MouseEvent) => { const p = getPos(e); onMove(p.x, p.y); };
        const handleTouchStart = (e: TouchEvent) => { if (e.touches[0]) { const p = getPos(e.touches[0]); onDown(p.x, p.y); } };
        const handleTouchMove = (e: TouchEvent) => { if (e.touches[0]) { e.preventDefault(); const p = getPos(e.touches[0]); onMove(p.x, p.y); } };

        canvas.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", onUp);
        canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
        canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
        canvas.addEventListener("touchend", onUp);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener("resize", resize);
            canvas.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", onUp);
            canvas.removeEventListener("touchstart", handleTouchStart);
            canvas.removeEventListener("touchmove", handleTouchMove);
            canvas.removeEventListener("touchend", onUp);
        };
    }, [initPineapples]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0"
            style={{ cursor: "grab" }}
        />
    );
}
