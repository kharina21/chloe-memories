import React, { useEffect, useRef } from 'react';

// Heart shapes — mix of emoji and unicode for variety
const HEART_SHAPES = ['❤️', '🩷', '💕', '💖', '💗', '💓', '🫶', '♥'];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function FloatingHearts({ enabled = true }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing hearts when disabled
    if (!enabled) {
      container.innerHTML = '';
      return;
    }

    // ── Heart loop ─────────────────────────────────────────
    let heartFrameId;
    let lastHeartSpawn = 0;
    const heartInterval = () => randomBetween(600, 1200);
    let nextHeartSpawn = heartInterval();

    const spawnHeart = (timestamp) => {
      if (!lastHeartSpawn) lastHeartSpawn = timestamp;
      const elapsed = timestamp - lastHeartSpawn;

      if (elapsed >= nextHeartSpawn) {
        lastHeartSpawn = timestamp;
        nextHeartSpawn = heartInterval();

        const heart = document.createElement('div');
        heart.classList.add('wind-heart');
        heart.textContent = HEART_SHAPES[Math.floor(Math.random() * HEART_SHAPES.length)];

        const topPct      = randomBetween(0, 25);
        const size        = randomBetween(14, 28);
        const duration    = randomBetween(5, 10);
        const rotateStart = randomBetween(20, 45);
        const rotateEnd   = randomBetween(-10, 20);
        const opacityPeak = randomBetween(0.55, 0.95);
        const startOffset = randomBetween(0, 40);

        heart.style.cssText = `
          position: fixed;
          top: ${topPct}vh;
          right: -${30 + startOffset}px;
          font-size: ${size}px;
          opacity: 0;
          pointer-events: none;
          z-index: 9999;
          user-select: none;
          animation: windHeartFly ${duration}s ease-in-out forwards;
          --rotate-start: ${rotateStart}deg;
          --rotate-end: ${rotateEnd}deg;
          --opacity-peak: ${opacityPeak};
        `;

        container.appendChild(heart);
        heart.addEventListener('animationend', () => heart.remove());
      }

      heartFrameId = requestAnimationFrame(spawnHeart);
    };

    heartFrameId = requestAnimationFrame(spawnHeart);

    return () => {
      cancelAnimationFrame(heartFrameId);
      if (container) container.innerHTML = '';
    };
  }, [enabled]);

  return <div ref={containerRef} aria-hidden="true" />;
}
