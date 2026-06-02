import React, { useEffect, useRef } from 'react';

// Heart shapes — mix of emoji and unicode for variety
const HEART_SHAPES = ['❤️', '🩷', '💕', '💖', '💗', '💓', '🫶', '♥'];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function FloatingHearts() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId;
    let lastSpawn = 0;
    // Spawn a new heart every 600–1200 ms
    const spawnInterval = () => randomBetween(600, 1200);
    let nextSpawn = spawnInterval();

    const spawnHeart = (timestamp) => {
      if (!lastSpawn) lastSpawn = timestamp;
      const elapsed = timestamp - lastSpawn;

      if (elapsed >= nextSpawn) {
        lastSpawn = timestamp;
        nextSpawn = spawnInterval();

        const heart = document.createElement('div');
        heart.classList.add('wind-heart');
        heart.textContent = HEART_SHAPES[Math.floor(Math.random() * HEART_SHAPES.length)];

        // Spawn near the TOP-RIGHT corner — top 0–25% of screen height
        const topPct = randomBetween(0, 25);
        // Random size (14px – 28px)
        const size = randomBetween(14, 28);
        // Random duration (5s – 10s)
        const duration = randomBetween(5, 10);
        // Subtle horizontal wobble so hearts don't look perfectly straight
        const wobbleX = randomBetween(-3, 3); // vw extra shift mid-flight
        // Random rotation swing (tilted as if carried by diagonal wind)
        const rotateStart = randomBetween(20, 45);
        const rotateEnd = randomBetween(-10, 20);
        // Random opacity peak
        const opacityPeak = randomBetween(0.55, 0.95);
        // Slight right-side start offset spread
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

        // Remove the element after animation ends
        heart.addEventListener('animationend', () => {
          heart.remove();
        });
      }

      animationFrameId = requestAnimationFrame(spawnHeart);
    };

    animationFrameId = requestAnimationFrame(spawnHeart);

    return () => {
      cancelAnimationFrame(animationFrameId);
      // Clean up any remaining hearts
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return <div ref={containerRef} aria-hidden="true" />;
}
