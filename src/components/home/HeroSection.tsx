import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';

const SUITS = ['♠', '♥', '♦', '♣'];

function FloatingSuits() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particles: HTMLSpanElement[] = [];
    const createParticle = () => {
      const span = document.createElement('span');
      span.className = 'float-suit-particle';
      span.textContent = SUITS[Math.floor(Math.random() * SUITS.length)];
      span.style.left = `${Math.random() * 100}%`;
      span.style.animationDuration = `${6 + Math.random() * 8}s`;
      span.style.animationDelay = `${Math.random() * 4}s`;
      span.style.fontSize = `${1 + Math.random() * 1.5}rem`;
      container.appendChild(span);
      particles.push(span);

      setTimeout(() => {
        span.remove();
        const idx = particles.indexOf(span);
        if (idx > -1) particles.splice(idx, 1);
      }, 14000);
    };

    // Initial burst
    for (let i = 0; i < 8; i++) setTimeout(createParticle, i * 300);
    const interval = setInterval(createParticle, 2000);

    return () => {
      clearInterval(interval);
      particles.forEach(p => p.remove());
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none" />;
}

interface HeroSectionProps {
  displayName: string;
}

export function HeroSection({ displayName }: HeroSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('home.good_morning') : hour < 18 ? t('home.good_afternoon') : t('home.good_evening');

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 pb-8 glass-card">
      <FloatingSuits />
      <div className="relative z-10 space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="text-2xl font-black text-shimmer">{displayName}</h1>
        </div>
        <p className="text-sm text-muted-foreground/80 max-w-[280px]">
          {t('home.hero_subtitle')}
        </p>
        <Button
          onClick={() => navigate('/poker')}
          className="shimmer-btn text-primary-foreground font-bold gap-2 px-6"
          size="lg"
        >
          <Gamepad2 className="h-5 w-5" />
          {t('home.play_now')}
        </Button>
      </div>
    </div>
  );
}
