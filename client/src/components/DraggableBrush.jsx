import React, { useState, useRef, useEffect } from 'react';

/**
 * DraggableBrush — interactive image widget
 * • Mouse drag / 1-finger touch → move anywhere on screen
 * • 2-finger pinch → scale up / down
 * • Double-tap / double-click → snap back to bottom-left corner
 */
export default function DraggableBrush({ src, initialWidth = 160 }) {
  // Start at bottom-left
  const [pos, setPos]       = useState({ x: 0, y: window.innerHeight - initialWidth * 1.6 });
  const [scale, setScale]   = useState(1);
  const [dragging, setDragging] = useState(false);

  const drag  = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const pinch = useRef({ active: false, startDist: 0, startScale: 1 });
  const lastTap = useRef(0);

  // ── Helpers ─────────────────────────────────────────────────
  const getDist = (t) => {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  };

  // ── Mouse events ────────────────────────────────────────────
  const onMouseDown = (e) => {
    e.preventDefault();
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y };
    setDragging(true);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!drag.current.active) return;
      setPos({
        x: drag.current.originX + (e.clientX - drag.current.startX),
        y: drag.current.originY + (e.clientY - drag.current.startY),
      });
    };
    const onMouseUp = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Touch events ────────────────────────────────────────────
  const onTouchStart = (e) => {
    // Double-tap detection → reset position
    const now = Date.now();
    if (e.touches.length === 1 && now - lastTap.current < 300) {
      setPos({ x: 0, y: window.innerHeight - initialWidth * 1.6 });
      setScale(1);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    if (e.touches.length === 1) {
      drag.current = {
        active: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        originX: pos.x,
        originY: pos.y,
      };
      setDragging(true);
    } else if (e.touches.length === 2) {
      drag.current.active = false;
      pinch.current = { active: true, startDist: getDist(e.touches), startScale: scale };
      setDragging(false);
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault(); // prevent page scroll while interacting

    if (e.touches.length === 1 && drag.current.active) {
      setPos({
        x: drag.current.originX + (e.touches[0].clientX - drag.current.startX),
        y: drag.current.originY + (e.touches[0].clientY - drag.current.startY),
      });
    } else if (e.touches.length === 2 && pinch.current.active) {
      const dist = getDist(e.touches);
      const newScale = Math.min(4, Math.max(0.25, pinch.current.startScale * (dist / pinch.current.startDist)));
      setScale(newScale);
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length === 0) {
      drag.current.active  = false;
      pinch.current.active = false;
      setDragging(false);
    }
  };

  // ── Double-click reset (desktop) ────────────────────────────
  const onDoubleClick = () => {
    setPos({ x: 0, y: window.innerHeight - initialWidth * 1.6 });
    setScale(1);
  };

  const currentWidth = initialWidth * scale;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position:     'fixed',
        left:         `${pos.x}px`,
        top:          `${pos.y}px`,
        width:        `${currentWidth}px`,
        zIndex:       9997,
        opacity:      dragging ? 0.75 : 0.92,
        cursor:       dragging ? 'grabbing' : 'grab',
        userSelect:   'none',
        touchAction:  'none',      // critical: suppresses browser scroll/zoom on touch
        pointerEvents: 'auto',
        // Smooth scale transition when NOT actively dragging
        transition:   dragging ? 'opacity 0.1s' : 'opacity 0.2s, width 0.12s ease-out',
        // Subtle drop shadow
        filter:       'drop-shadow(2px 4px 8px rgba(0,0,0,0.25))',
        // Bounce-in on first render
        animation:    'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}
    />
  );
}
