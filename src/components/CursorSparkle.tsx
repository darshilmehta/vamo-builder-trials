"use client";

import { useRef, useEffect, useCallback } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    /** index into SPRITE_SIZES */
    sizeIdx: number;
}

const SPAWN_RATE = 3;
// Pre-rendered sprite sizes in logical pixels
const SPRITE_SIZES = [14, 18, 22, 26] as const;

export function CursorSparkle({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({ x: 0, y: 0, active: false, lastX: 0, lastY: 0 });
    const animRef = useRef<number>(0);
    // One off-screen canvas per sprite size, built once (or on DPR change)
    const spritesRef = useRef<HTMLCanvasElement[]>([]);

    /** Pre-render emoji sprites so fillText is never called in the animation loop */
    const buildSprites = useCallback((dpr: number) => {
        spritesRef.current = SPRITE_SIZES.map((sz) => {
            const oc = document.createElement("canvas");
            oc.width = sz * 2 * dpr;
            oc.height = sz * 2 * dpr;
            const octx = oc.getContext("2d")!;
            octx.scale(dpr, dpr);
            octx.font = `${sz}px serif`;
            octx.textAlign = "center";
            octx.textBaseline = "middle";
            octx.fillText("🍍", sz, sz);
            return oc;
        });
    }, []);

    const spawnParticle = useCallback((x: number, y: number) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.8;  // was 1–4; now gentle drift
        const maxLife = 30 + Math.random() * 40;
        particlesRef.current.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            life: maxLife,
            maxLife,
            sizeIdx: Math.floor(Math.random() * SPRITE_SIZES.length),
        });
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + "px";
            canvas.style.height = rect.height + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            buildSprites(dpr);
        };
        resize();
        window.addEventListener("resize", resize);

        // tick is defined as a named function so onMouseMove can reference it
        function tick() {
            const rect = container!.getBoundingClientRect();
            ctx!.clearRect(0, 0, rect.width, rect.height);

            const mouse = mouseRef.current;

            if (mouse.active) {
                const dx = mouse.x - mouse.lastX;
                const dy = mouse.y - mouse.lastY;
                if (dx * dx + dy * dy > 4) {  // avoid sqrt: dist > 2
                    for (let i = 0; i < SPAWN_RATE; i++) {
                        spawnParticle(
                            mouse.x + (Math.random() - 0.5) * 10,
                            mouse.y + (Math.random() - 0.5) * 10
                        );
                    }
                }
            }

            const sprites = spritesRef.current;
            const alive: Particle[] = [];
            for (const p of particlesRef.current) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.008;  // very light gravity (was 0.03)
                p.vx *= 0.99;
                p.life -= 1;
                if (p.life <= 0) continue;

                const alpha = p.life / p.maxLife;
                const sz = SPRITE_SIZES[p.sizeIdx];
                ctx!.save();
                ctx!.globalAlpha = alpha;
                // drawImage from pre-rendered sprite — no font layout cost
                ctx!.drawImage(sprites[p.sizeIdx], p.x - sz, p.y - sz, sz * 2, sz * 2);
                ctx!.restore();
                alive.push(p);
            }
            particlesRef.current = alive;

            // Stop RAF when idle — no particles and mouse has left
            if (alive.length === 0 && !mouse.active) {
                animRef.current = 0;
                return;
            }
            animRef.current = requestAnimationFrame(tick);
        }

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
                // Restart RAF if it had gone idle
                if (!animRef.current) {
                    animRef.current = requestAnimationFrame(tick);
                }
            } else {
                mouseRef.current.active = false;
            }
        };
        const onMouseLeave = () => { mouseRef.current.active = false; };

        container.addEventListener("mousemove", onMouseMove);
        container.addEventListener("mouseleave", onMouseLeave);

        // RAF starts only on first mousemove — saves GPU budget on idle pages
        animRef.current = 0;

        return () => {
            cancelAnimationFrame(animRef.current);
            animRef.current = 0;
            window.removeEventListener("resize", resize);
            container.removeEventListener("mousemove", onMouseMove);
            container.removeEventListener("mouseleave", onMouseLeave);
        };
    }, [containerRef, spawnParticle, buildSprites]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 pointer-events-none"
        />
    );
}
