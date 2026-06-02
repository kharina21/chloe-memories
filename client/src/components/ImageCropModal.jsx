import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, RotateCw } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * ImageCropModal — simple square crop with pan + zoom
 * Props:
 *   src       : string   — object URL of the selected image
 *   onConfirm : (File) => void  — called with cropped File
 *   onCancel  : () => void
 */
export default function ImageCropModal({ src, onConfirm, onCancel }) {
  const [zoom, setZoom]           = useState(1);
  const [offset, setOffset]       = useState({ x: 0, y: 0 });
  const [dragging, setDragging]   = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize]     = useState({ w: 0, h: 0 });
  const [rotation, setRotation]   = useState(0);

  const BOX = 300; // display crop box size in px
  const imgRef = useRef(null);

  // When image loads, centre it inside the crop box
  const onLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.target;
    setImgSize({ w, h });
    // initial zoom to fill the square box
    const initZoom = Math.max(BOX / w, BOX / h);
    setZoom(initZoom);
    setOffset({ x: 0, y: 0 });
  };

  // ── Drag to pan ────────────────────────────────────────────
  const onMouseDown = (e) => { setDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); };
  const onMouseMove = (e) => { if (!dragging) return; setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const onMouseUp   = () => setDragging(false);

  // Touch support
  const onTouchStart = (e) => { const t = e.touches[0]; setDragging(true); setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y }); };
  const onTouchMove  = (e) => { if (!dragging) return; const t = e.touches[0]; setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y }); };
  const onTouchEnd   = () => setDragging(false);

  // ── Confirm crop ────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    const OUT = 600;
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d');

    const { w, h } = imgSize;
    // scaled image dimensions on screen
    const sw = w * zoom;
    const sh = h * zoom;

    // top-left of the image inside the BOX div
    const imgLeft = (BOX - sw) / 2 + offset.x;
    const imgTop  = (BOX - sh) / 2 + offset.y;

    // Which part of the natural image is visible in the BOX
    const scaleX = w / sw;
    const scaleY = h / sh;

    const srcX = -imgLeft * scaleX;
    const srcY = -imgTop  * scaleY;
    const srcW = BOX * scaleX;
    const srcH = BOX * scaleY;

    // Apply rotation
    ctx.save();
    ctx.translate(OUT / 2, OUT / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      imgRef.current,
      Math.max(0, srcX), Math.max(0, srcY),
      Math.min(srcW, w - Math.max(0, srcX)),
      Math.min(srcH, h - Math.max(0, srcY)),
      -OUT / 2, -OUT / 2, OUT, OUT
    );
    ctx.restore();

    canvas.toBlob((blob) => {
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      onConfirm(file);
    }, 'image/jpeg', 0.92);
  }, [imgSize, zoom, offset, rotation, onConfirm]);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', maxWidth: '380px', width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #ffd3da' }}>
          <span style={{ fontWeight: 800, color: '#ff6b8b', fontSize: '1rem' }}>✂️ Căn chỉnh ảnh</span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377' }}><X size={20} /></button>
        </div>

        {/* Crop box */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 20px 0' }}>
          <div
            style={{
              width: BOX, height: BOX,
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
              cursor: dragging ? 'grabbing' : 'grab',
              border: '3px solid #ff6b8b',
              boxShadow: '0 0 0 2px white, 0 0 0 4px #ff6b8b',
              background: '#000',
              userSelect: 'none',
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            {/* Grid overlay */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: `${BOX/3}px ${BOX/3}px` }} />
            <img
              ref={imgRef}
              src={src}
              alt="crop preview"
              onLoad={onLoad}
              draggable={false}
              style={{
                position: 'absolute',
                width: imgSize.w * zoom,
                height: imgSize.h * zoom,
                left: `calc(50% - ${imgSize.w * zoom / 2}px)`,
                top: `calc(50% - ${imgSize.h * zoom / 2}px)`,
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Zoom slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ZoomOut size={16} color="#8c7377" />
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#ff6b8b' }}
            />
            <ZoomIn size={16} color="#8c7377" />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              style={{ flex: 1, padding: '10px', border: '1px solid #ffd3da', borderRadius: '12px', background: 'white', cursor: 'pointer', color: '#8c7377', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <RotateCw size={14} /> Xoay
            </button>
            <button
              onClick={onCancel}
              style={{ flex: 1, padding: '10px', border: '1px solid #ffd3da', borderRadius: '12px', background: 'white', cursor: 'pointer', color: '#8c7377', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #ff6b8b, #ff477e)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem' }}
            >
              <Check size={16} /> Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  , document.body);
}
