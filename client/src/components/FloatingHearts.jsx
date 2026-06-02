import React, { useEffect, useRef } from 'react';

// Heart shapes — mix of emoji and unicode for variety
const HEART_SHAPES = ['❤️', '🩷', '💕', '💖', '💗', '💓', '🫶', '♥'];

// Love messages that float from left to right
const LOVE_MESSAGES = [
  'Thảo iu ơi, em nhớ chị! 💕',
  'Thảo iu ơi, em nhớ chị!',
  'Thảo iu ơi, em nhớ chị! 🩷',
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function FloatingHearts() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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

    // ── Text loop (left → right, wavy) ─────────────────────
    let textTimerId;

    const spawnText = () => {
      const el = document.createElement('div');
      el.classList.add('floating-love-text');

      // Pick a random message
      el.textContent = LOVE_MESSAGES[Math.floor(Math.random() * LOVE_MESSAGES.length)];

      // Random vertical lane — avoid very top / bottom edges
      const topPct  = randomBetween(18, 75);
      // Random duration 10–16s for a gentle drift
      const duration = randomBetween(10, 16);
      // Random wave amplitude & phase offset
      const amp   = randomBetween(12, 28);   // px up/down swing
      const phase = randomBetween(0, 360);   // deg offset so not all same phase

      el.style.cssText = `
        position: fixed;
        top: ${topPct}vh;
        left: -420px;
        opacity: 0;
        pointer-events: none;
        z-index: 9998;
        user-select: none;
        white-space: nowrap;
        font-size: ${randomBetween(13, 17)}px;
        font-weight: 700;
        font-family: 'Outfit', 'Inter', sans-serif;
        background: linear-gradient(90deg, #ff6b8b, #ffb6c8, #e6a100);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 1px 4px rgba(255,107,139,0.45));
        letter-spacing: 0.02em;
        animation: floatingTextFly ${duration}s linear forwards;
        --text-amp: ${amp}px;
        --text-phase: ${phase}deg;
      `;

      container.appendChild(el);
      el.addEventListener('animationend', () => el.remove());

      // Schedule next text spawn: every 7–14 seconds
      textTimerId = setTimeout(spawnText, randomBetween(7000, 14000));
    };

    // First text spawns after a short delay
    textTimerId = setTimeout(spawnText, randomBetween(1500, 3000));

    return () => {
      cancelAnimationFrame(heartFrameId);
      clearTimeout(textTimerId);
      if (container) container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} aria-hidden="true" />;
}
