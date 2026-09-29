import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
}

interface GravitationalOrb {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  glowColor: string;
  pulse: number;
  phase: number;
}

export const AntigravityBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates for interactive antigravity repulsion field
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 180,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Vibrant antigravity particle palette: Cyan, Electric Emerald, Violet, Starlight Blue
    const particleColors = [
      'rgba(56, 189, 248, ', // sky
      'rgba(52, 211, 153, ', // emerald
      'rgba(168, 85, 247, ', // purple
      'rgba(129, 140, 248, ', // indigo
      'rgba(244, 114, 182, ', // pink
      'rgba(255, 255, 255, ', // starlight
    ];

    // Generate levitating antigravity particles
    const particleCount = Math.min(85, Math.floor((width * height) / 16000));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const colorPrefix = particleColors[Math.floor(Math.random() * particleColors.length)];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        // Antigravity upward drift (negative vy) with subtle lateral swaying
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.3 - Math.random() * 0.7, // Defying gravity upward
        size: Math.random() * 2.8 + 1.2,
        baseAlpha: Math.random() * 0.5 + 0.25,
        alpha: Math.random() * 0.5 + 0.25,
        color: colorPrefix,
        pulseSpeed: 0.015 + Math.random() * 0.025,
        pulsePhase: Math.random() * Math.PI * 2,
        orbitRadius: Math.random() * 1.5,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    // Large floating quantum/antigravity orbs in background
    const orbs: GravitationalOrb[] = [
      {
        x: width * 0.2,
        y: height * 0.35,
        radius: 220,
        vx: 0.12,
        vy: -0.15,
        color: 'rgba(99, 102, 241, 0.07)',
        glowColor: 'rgba(147, 51, 234, 0.12)',
        pulse: 0,
        phase: 0,
      },
      {
        x: width * 0.8,
        y: height * 0.65,
        radius: 280,
        vx: -0.14,
        vy: -0.1,
        color: 'rgba(16, 185, 129, 0.06)',
        glowColor: 'rgba(6, 182, 212, 0.1)',
        pulse: 0,
        phase: Math.PI / 2,
      },
      {
        x: width * 0.5,
        y: height * 0.85,
        radius: 190,
        vx: 0.1,
        vy: -0.18,
        color: 'rgba(217, 70, 239, 0.05)',
        glowColor: 'rgba(59, 130, 246, 0.09)',
        pulse: 0,
        phase: Math.PI,
      },
    ];

    let time = 0;

    // Render loop
    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, width, height);

      // Deep space antigravity void gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#020617'); // obsidian slate
      bgGrad.addColorStop(0.5, '#050b1d'); // deep cosmic blue
      bgGrad.addColorStop(1, '#030712'); // void black
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw floating ethereal gravitational orbs
      for (const orb of orbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;
        orb.phase += 0.01;

        // Wrap around viewport with soft antigravity drift
        if (orb.y + orb.radius < -100) orb.y = height + orb.radius + 50;
        if (orb.y - orb.radius > height + 100) orb.y = -orb.radius - 50;
        if (orb.x + orb.radius < -100) orb.x = width + orb.radius + 50;
        if (orb.x - orb.radius > width + 100) orb.x = -orb.radius - 50;

        const currentRadius = orb.radius + Math.sin(orb.phase) * 20;

        const orbGradient = ctx.createRadialGradient(
          orb.x,
          orb.y,
          0,
          orb.x,
          orb.y,
          currentRadius
        );
        orbGradient.addColorStop(0, orb.glowColor);
        orbGradient.addColorStop(0.5, orb.color);
        orbGradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = orbGradient;
        ctx.fill();
      }

      // 2. Antigravity gravitational field lines (subtle quantum filaments between close particles)
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      // 3. Levitating antigravity motes & particles
      for (const p of particles) {
        // Floating mechanics: negative gravity upward + oscillating lateral wave
        p.orbitAngle += p.orbitSpeed;
        p.pulsePhase += p.pulseSpeed;

        const swayX = Math.sin(p.pulsePhase) * 0.35;
        p.x += p.vx + swayX;
        p.y += p.vy;

        // Interactive mouse antigravity force: particles gently levitate away from pointer
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * 2.2;
          const angle = Math.atan2(dy, dx);
          p.x += Math.cos(angle) * force;
          // Extra upward lift when disturbed by mouse
          p.y += Math.sin(angle) * force - 0.8;
        }

        // Loop from top back to bottom (continuous upward levitation)
        if (p.y < -15) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -15) p.x = width + 10;
        if (p.x > width + 15) p.x = -10;

        // Dynamic pulsing alpha
        const pulse = Math.sin(p.pulsePhase) * 0.25;
        p.alpha = Math.max(0.1, Math.min(0.9, p.baseAlpha + pulse));

        // Draw particle with outer glow
        const glowRadius = p.size * 2.5;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        glow.addColorStop(0, `${p.color}${p.alpha})`);
        glow.addColorStop(0.5, `${p.color}${p.alpha * 0.35})`);
        glow.addColorStop(1, `${p.color}0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core bright center
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.min(1, p.alpha * 1.5)})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Subtle cosmic vignette & starlight mesh overlay */}
      <div 
        className="absolute inset-0 bg-radial-vignette opacity-70"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(2, 6, 23, 0.75) 100%)',
        }}
      />
    </div>
  );
};
