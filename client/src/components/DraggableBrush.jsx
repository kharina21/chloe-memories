import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * DraggableBrush — interactive image widget with real-time partner sync
 * • Mouse drag / 1-finger touch → move anywhere on screen
 * • 2-finger pinch → scale up / down
 * • Double-tap / double-click → snap back to bottom-left corner
 * • socket prop → emits brush:move to partner (throttled 80ms)
 *                 listens for partner's brush:move and animates smoothly
 */
export default function DraggableBrush({ src, initialWidth = 160, socket }) {
  const [pos, setPos]       = useState({ x: 0, y: window.innerHeight - initialWidth * 1.6 });
  const [scale, setScale]   = useState(1);
  const [dragging, setDragging] = useState(false);

  // Internal refs — always up-to-date inside event handlers (no stale closures)
  const socketRef   = useRef(socket);
  const posRef      = useRef(pos);
  const scaleRef    = useRef(scale);
  const drag        = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const pinch       = useRef({ active: false, startDist: 0, startScale: 1 });
  const lastTap     = useRef(0);
  const emitTimer   = useRef(null);

  // Keep refs in sync with state/props
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // ── Helpers ─────────────────────────────────────────────────
  const getDist = (t) => Math.hypot(
    t[0].clientX - t[1].clientX,
    t[0].clientY - t[1].clientY
  );

  // Throttled emit — reads socketRef so always has latest socket
  const emitMove = useCallback((x, y, s) => {
    if (!socketRef.current) return;
    if (emitTimer.current) return;
    emitTimer.current = setTimeout(() => {
      emitTimer.current = null;
      if (socketRef.current) {
        socketRef.current.emit('brush:move', { x, y, scale: s });
      }
    }, 80);
  }, []);

  // ── Listen for partner brush position ───────────────────────
  useEffect(() => {
    if (!socket) return;
    const onPartnerMove = ({ x, y, scale: s }) => {
      setPos({ x, y });
      if (s !== undefined) setScale(s);
    };
    socket.on('brush:move', onPartnerMove);
    return () => socket.off('brush:move', onPartnerMove);
  }, [socket]);  // re-runs whenever socket changes (null → real socket)

  // ── Mouse events (window-level for smooth drag-out-of-element) ──
  const onMouseDown = (e) => {
    e.preventDefault();
    drag.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      originX: posRef.current.x, originY: posRef.current.y,
    };
    setDragging(true);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!drag.current.active) return;
      const x = drag.current.originX + (e.clientX - drag.current.startX);
      const y = drag.current.originY + (e.clientY - drag.current.startY);
      setPos({ x, y });
      emitMove(x, y, scaleRef.current);
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
  }, [emitMove]); // stable — emitMove is useCallback

  // ── Touch events ────────────────────────────────────────────
  const onTouchStart = (e) => {
    // Double-tap → reset to bottom-left
    const now = Date.now();
    if (e.touches.length === 1 && now - lastTap.current < 300) {
      const resetPos = { x: 0, y: window.innerHeight - initialWidth * 1.6 };
      setPos(resetPos);
      setScale(1);
      emitMove(resetPos.x, resetPos.y, 1);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    if (e.touches.length === 1) {
      drag.current = {
        active: true,
        startX: e.touches[0].clientX, startY: e.touches[0].clientY,
        originX: posRef.current.x, originY: posRef.current.y,
      };
      setDragging(true);
    } else if (e.touches.length === 2) {
      drag.current.active = false;
      pinch.current = { active: true, startDist: getDist(e.touches), startScale: scaleRef.current };
      setDragging(false);
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && drag.current.active) {
      const x = drag.current.originX + (e.touches[0].clientX - drag.current.startX);
      const y = drag.current.originY + (e.touches[0].clientY - drag.current.startY);
      setPos({ x, y });
      emitMove(x, y, scaleRef.current);
    } else if (e.touches.length === 2 && pinch.current.active) {
      const dist = getDist(e.touches);
      const newScale = Math.min(4, Math.max(0.25, pinch.current.startScale * (dist / pinch.current.startDist)));
      setScale(newScale);
      emitMove(posRef.current.x, posRef.current.y, newScale);
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
    const resetPos = { x: 0, y: window.innerHeight - initialWidth * 1.6 };
    setPos(resetPos);
    setScale(1);
    emitMove(resetPos.x, resetPos.y, 1);
  };

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
        width:        `${initialWidth * scale}px`,
        zIndex:       9997,
        opacity:      dragging ? 0.72 : 0.92,
        cursor:       dragging ? 'grabbing' : 'grab',
        userSelect:   'none',
        touchAction:  'none',
        pointerEvents: 'auto',
        // Smooth transition when receiving partner's position update
        transition:   dragging
          ? 'opacity 0.1s'
          : 'opacity 0.2s, left 0.18s cubic-bezier(0.25,0.46,0.45,0.94), top 0.18s cubic-bezier(0.25,0.46,0.45,0.94), width 0.12s ease-out',
        filter:       'drop-shadow(2px 4px 8px rgba(0,0,0,0.25))',
        animation:    'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}
    />
  );
}
