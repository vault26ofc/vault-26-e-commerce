import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Volume2, VolumeX, RotateCcw, Sparkles, Shield, Cpu, Layers, ArrowDown } from 'lucide-react';
import type { CMSSection } from '../types';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 90;
const LERP = 0.08; // Smoothness factor

export default function CinematicHeroSection({ section }: { section?: CMSSection }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIndexRef = useRef(0);
  const targetFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const imagesRef = useRef<HTMLCanvasElement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeSpotlight, setActiveSpotlight] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);

  // Generates high-res 3D keyframe canvases in memory for ultra-fast silky rendering
  const generateFrameSequence = useCallback(() => {
    const frames: HTMLCanvasElement[] = [];
    const width = 1200;
    const height = 1200;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = width;
      offCanvas.height = height;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) continue;

      const progress = i / (TOTAL_FRAMES - 1);
      const angle = progress * Math.PI * 2.5;

      // Dark background vignette with subtle glow
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 600);
      bgGrad.addColorStop(0, '#12141c');
      bgGrad.addColorStop(0.6, '#08090d');
      bgGrad.addColorStop(1, '#020204');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Particle starfield / subtle obsidian dust
      for (let p = 0; p < 45; p++) {
        const px = (Math.sin(p * 99 + i * 0.02) * 0.5 + 0.5) * width;
        const py = (Math.cos(p * 33 + i * 0.015) * 0.5 + 0.5) * height;
        const pSize = (Math.sin(p + i * 0.05) + 1.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + 0.1 * Math.sin(p * 12)})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(width / 2, height / 2);

      // 3D Matrix scale dynamic explosion based on scroll
      const explodeFactor = Math.sin(progress * Math.PI) * 50;
      const hoverY = Math.sin(progress * Math.PI * 4) * 12;
      ctx.translate(0, hoverY);

      // Shadow casting
      ctx.save();
      ctx.translate(0, 320);
      ctx.scale(1, 0.25);
      const shadowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 280);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 280, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outer Holographic Halo ring
      ctx.strokeStyle = `rgba(230, 190, 120, ${0.12 + 0.08 * Math.sin(angle)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 310 + explodeFactor, 180 + explodeFactor * 0.5, angle * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // Main Outer Shell - Technical 3D Metallic Armor Jacket / Vault Cylinder Core
      const rotCos = Math.cos(angle);
      const rotSin = Math.sin(angle);

      // Layer 1: Core Titanium Cylinder Frame
      for (let layer = -2; layer <= 2; layer++) {
        const layerZ = layer * (40 + explodeFactor * 0.6);
        const layerScale = 1 - Math.abs(layer) * 0.08;
        
        ctx.save();
        ctx.translate(layerZ * rotSin * 0.5, layerZ * rotCos * 0.2);
        ctx.scale(layerScale, layerScale);

        // Polygon 3D Vault Monolith
        ctx.beginPath();
        const pts = 8;
        for (let pt = 0; pt <= pts; pt++) {
          const ptAngle = (pt / pts) * Math.PI * 2 + angle;
          const rx = Math.cos(ptAngle) * 220;
          const ry = Math.sin(ptAngle) * 110;
          if (pt === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();

        const armorGrad = ctx.createLinearGradient(-150, -150, 150, 150);
        armorGrad.addColorStop(0, '#2a2d3d');
        armorGrad.addColorStop(0.3, '#181924');
        armorGrad.addColorStop(0.6, '#3b3f54');
        armorGrad.addColorStop(0.85, '#101117');
        armorGrad.addColorStop(1, '#d4af37');

        ctx.fillStyle = armorGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 25;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Layer 2: Central Vault Emblem (Rotating Golden Core)
      ctx.save();
      ctx.rotate(angle * 1.2);
      const emblemGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 110);
      emblemGrad.addColorStop(0, '#fff4d0');
      emblemGrad.addColorStop(0.4, '#e5c158');
      emblemGrad.addColorStop(0.8, '#997316');
      emblemGrad.addColorStop(1, '#2b1f04');
      ctx.fillStyle = emblemGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 95, 0, Math.PI * 2);
      ctx.fill();

      // Laser Etched 26 Emblem
      ctx.fillStyle = '#0a0a0d';
      ctx.font = '900 64px "Instrument Serif", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('V26', 0, 0);
      ctx.restore();

      // Specular Light Streak Across Surface
      const shinePos = (progress * 3 - 1) * width;
      const shineGrad = ctx.createLinearGradient(shinePos - 120, -200, shinePos + 120, 200);
      shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
      shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shineGrad;
      ctx.fillRect(-width / 2, -height / 2, width, height);

      ctx.restore();

      frames.push(offCanvas);
    }

    imagesRef.current = frames;
    setLoaded(true);
  }, []);

  useEffect(() => {
    generateFrameSequence();
  }, [generateFrameSequence]);

  // 3-LAYER BLENDING canvas renderer
  const drawBlended = useCallback((frameFloat: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const total = imagesRef.current.length;
    if (total === 0) return;

    const clamped = Math.max(0, Math.min(total - 1, frameFloat));
    const idxA = Math.floor(clamped);
    const idxB = Math.min(idxA + 1, total - 1);
    const frac = clamped - idxA;

    const imgA = imagesRef.current[idxA];
    const imgB = imagesRef.current[idxB];
    if (!imgA) return;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    // Draw base frame A
    const scaleA = Math.max(cw / imgA.width, ch / imgA.height);
    const dwA = imgA.width * scaleA;
    const dhA = imgA.height * scaleA;
    ctx.globalAlpha = 1;
    ctx.drawImage(imgA, (cw - dwA) / 2, (ch - dhA) / 2, dwA, dhA);

    // Sub-frame cross-fade frame B for silky 60fps smoothing
    if (frac > 0.001 && imgB) {
      const scaleB = Math.max(cw / imgB.width, ch / imgB.height);
      const dwB = imgB.width * scaleB;
      const dhB = imgB.height * scaleB;
      ctx.globalAlpha = frac;
      ctx.drawImage(imgB, (cw - dwB) / 2, (ch - dhB) / 2, dwB, dhB);
    }
    ctx.globalAlpha = 1;
  }, []);

  // Window resize handle
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      drawBlended(currentFrameRef.current);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawBlended]);

  // LERP LOOP & GSAP ScrollTrigger wiring
  useEffect(() => {
    if (!loaded) return;

    drawBlended(0);

    let animId: number;

    const tick = () => {
      currentFrameRef.current += (targetFrameRef.current - currentFrameRef.current) * LERP;
      const diff = Math.abs(targetFrameRef.current - currentFrameRef.current);
      if (diff > 0.001) {
        drawBlended(currentFrameRef.current);
        setProgressPercent(Math.round((currentFrameRef.current / (TOTAL_FRAMES - 1)) * 100));
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    const obj = { frame: 0 };
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 2, // 2-second GSAP smooth buffer
      onUpdate: (self) => {
        const frameVal = self.progress * (TOTAL_FRAMES - 1);
        targetFrameRef.current = frameVal;
        obj.frame = frameVal;
      },
    });

    return () => {
      st.kill();
      cancelAnimationFrame(animId);
    };
  }, [loaded, drawBlended]);

  return (
    <section ref={sectionRef} className="relative w-full bg-black text-white select-none" style={{ height: '400vh' }}>
      {/* STICKY VIEWPORT CONTAINER */}
      <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center">
        {/* CANVAS LAYER */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* HUD & OVERLAY GRAPHICS */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 md:p-12 z-10">
          {/* Top Bar */}
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs tracking-[0.2em] font-mono uppercase text-neutral-300">
                ARCHIVE ZERO-1 // 360° FRAME SEQUENCE
              </span>
            </div>

            <div className="flex items-center space-x-3 pointer-events-auto">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2.5 rounded-full bg-black/40 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white transition-all"
                title={isMuted ? 'Unmute ambient audio' : 'Mute ambient audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
              </button>
            </div>
          </div>

          {/* Dynamic Scroll Milestones & Headings */}
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center text-center my-auto transition-all duration-700">
            {progressPercent < 25 && (
              <div className="space-y-4 animate-fade-in">
                <span className="text-xs uppercase tracking-[0.3em] text-amber-400 font-mono flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> REVEALING THE ARCHIVE
                </span>
                <h2 className="text-5xl md:text-8xl font-serif tracking-tight font-light text-white drop-shadow-2xl">
                  ARCHIVE ZERO-1
                </h2>
                <p className="text-neutral-400 max-w-xl mx-auto text-sm md:text-base font-sans tracking-wide">
                  Sculpted titanium weave, engineered for eternal durability. Scroll to inspect every dimension.
                </p>
              </div>
            )}

            {progressPercent >= 25 && progressPercent < 65 && (
              <div className="space-y-4 animate-fade-in">
                <span className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-mono flex items-center justify-center gap-2">
                  <Cpu className="w-3.5 h-3.5" /> EXPLODED ARCHITECTURE
                </span>
                <h2 className="text-4xl md:text-7xl font-serif tracking-tight text-white drop-shadow-2xl">
                  PRECISION CRAFTSMANSHIP
                </h2>
                <p className="text-neutral-300 max-w-xl mx-auto text-sm md:text-base font-sans">
                  Dual-chamber internal skeleton with micro-laser etched Vault auth signature.
                </p>
              </div>
            )}

            {progressPercent >= 65 && (
              <div className="space-y-4 animate-fade-in">
                <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 font-mono flex items-center justify-center gap-2">
                  <Shield className="w-3.5 h-3.5" /> LIMITED EDITION RELEASE
                </span>
                <h2 className="text-4xl md:text-7xl font-serif tracking-tight text-white drop-shadow-2xl">
                  LIMITED TO 26 PIECES
                </h2>
                <div className="pt-2 pointer-events-auto">
                  <a
                    href="/shop"
                    className="inline-flex items-center px-8 py-3.5 rounded-full bg-white text-black font-semibold text-xs tracking-[0.2em] uppercase hover:bg-neutral-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105"
                  >
                    PRE-ORDER NOW
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls & Progress Bar */}
          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400">
              <ArrowDown className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>SCROLL TO ROTATE</span>
            </div>

            {/* Timeline Progress Bar */}
            <div className="w-full max-w-xs bg-white/10 h-1 rounded-full overflow-hidden backdrop-blur-md">
              <div
                className="bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400 h-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="text-xs font-mono text-neutral-400">
              FRAME {String(Math.floor((progressPercent / 100) * (TOTAL_FRAMES - 1))).padStart(2, '0')} / {TOTAL_FRAMES}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
