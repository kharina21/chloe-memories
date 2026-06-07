import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Music, Disc,
  ChevronDown, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, List
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
function fmt(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────────────────────────────────────────────────────
   Build a flat queue from partner music, my music, playlists
───────────────────────────────────────────────────────── */
function buildQueue(partnerMusic, myMusic) {
  const songs = [];
  if (partnerMusic) songs.push({ ...partnerMusic, _label: '❤️ Người ấy' });
  if (myMusic)      songs.push({ ...myMusic, _label: '🎵 Bạn' });
  return songs;
}

/* ─────────────────────────────────────────────────────────
   Tiny Visualizer bars
───────────────────────────────────────────────────────── */
function Visualizer({ isPlaying }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '18px', width: '40px' }}>
      {[0.55, 1, 0.7, 0.9, 0.6].map((h, i) => (
        <div key={i} style={{
          flex: 1,
          borderRadius: '2px',
          backgroundColor: '#ff6b8b',
          height: isPlaying ? '100%' : '3px',
          maxHeight: `${h * 18}px`,
          animation: isPlaying ? `vizBar 1.1s ease-in-out ${i * 0.13}s infinite alternate` : 'none',
          transition: 'height 0.3s'
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MusicPlayer — single responsive instance
   Props: partnerMusic, myMusic
───────────────────────────────────────────────────────── */
export default function MusicPlayer({ partnerMusic, myMusic }) {
  // ── Queue & index ────────────────────────────────────────
  const [queue, setQueue]           = useState([]);
  const [idx, setIdx]               = useState(0);
  const [repeatMode, setRepeatMode] = useState('none'); // none | all | one
  const [isShuffled, setIsShuffled] = useState(false);
  const [showQueue, setShowQueue]   = useState(false);

  // ── Player state ─────────────────────────────────────────
  const [isPlaying, setIsPlaying]         = useState(false);
  const [volume, setVolume]               = useState(60);
  const [isMuted, setIsMuted]             = useState(false);
  const [currentTime, setCurrentTime]     = useState(0);
  const [duration, setDuration]           = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // ── UI state ─────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);
  // Detect desktop via matchMedia (updates on resize)
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);

  // ── Refs ─────────────────────────────────────────────────
  const playerRef    = useRef(null);
  const pollRef      = useRef(null);
  const isSeeking    = useRef(false); // true while user drags slider

  // ── Responsive detection ─────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // On desktop always show expanded inline; on mobile FAB collapses
  const showExpanded = isDesktop || isExpanded;

  // ── Build queue when sources change ──────────────────────
  useEffect(() => {
    const base = buildQueue(partnerMusic, myMusic);
    setQueue(isShuffled ? shuffle(base) : base);
    setIdx(0);
  }, [partnerMusic?.id, myMusic?.id]);

  const currentSong = queue[idx] || null;

  // ── Song ended handler ────────────────────────────────────
  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      try {
        playerRef.current?.seekTo(0, true);
        playerRef.current?.playVideo();
      } catch (err) {
        console.error("Error in handleEnded repeat:", err);
      }
    } else if (queue.length > 1 && (repeatMode === 'all' || idx < queue.length - 1)) {
      setIdx(prev => (prev + 1) % queue.length);
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [repeatMode, queue.length, idx]);

  // ── YouTube player setup ──────────────────────────────────
  useEffect(() => {
    if (!currentSong || currentSong.source !== 'youtube') {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    // Load YT API script if needed
    if (!window.YT || !window.YT.Player) {
      if (!document.getElementById('yt-api')) {
        const tag = document.createElement('script');
        tag.id  = 'yt-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    const init = () => {
      if (!window.YT || !window.YT.Player) return;
      clearInterval(pollRef.current);

      // If player already exists — just load new video
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          playerRef.current.loadVideoById({ videoId: currentSong.id, suggestedQuality: 'small' });
          playerRef.current.setVolume(isMuted ? 0 : volume);
          return;
        } catch (err) {
          console.error("Failed to load video on existing player, recreating:", err);
          playerRef.current = null;
        }
      }

      playerRef.current = new window.YT.Player('yt-hidden-player', {
        height: '0',
        width: '0',
        videoId: currentSong.id,
        playerVars: {
          autoplay: 1, controls: 0, disablekb: 1, fs: 0,
          modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3,
          loop: 0,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(isMuted ? 0 : volume);
            e.target.playVideo();
            setTimeout(() => {
              const state = e.target.getPlayerState?.();
              if (state !== 1) {
                setAutoplayBlocked(true);
                setIsPlaying(false);
              } else {
                setAutoplayBlocked(false);
                setIsPlaying(true);
              }
            }, 1000);
          },
          onStateChange: (e) => {
            if (e.data === 1) { setIsPlaying(true);  setAutoplayBlocked(false); }
            if (e.data === 2) { setIsPlaying(false); }
            if (e.data === 0) {
              // Song ended
              handleEnded();
            }
          },
        },
      });
    };

    pollRef.current = setInterval(init, 200);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id]);

  // ── Poll timeline ─────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (isPlaying && playerRef.current) {
      timer = setInterval(() => {
        if (!isSeeking.current && playerRef.current) {
          try {
            const t = playerRef.current.getCurrentTime?.();
            const d = playerRef.current.getDuration?.();
            if (t !== undefined) setCurrentTime(t);
            if (d) setDuration(d);
          } catch {}
        }
      }, 400);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentSong?.id]);

  // ── Autoplay recovery ─────────────────────────────────────
  useEffect(() => {
    if (!autoplayBlocked) return;
    const recover = () => {
      try {
        playerRef.current?.playVideo?.();
      } catch (err) {
        console.error("Error in recover playVideo:", err);
      }
      setAutoplayBlocked(false);
      setIsPlaying(true);
    };
    document.addEventListener('click', recover, { once: true });
    document.addEventListener('touchstart', recover, { once: true });
    return () => {
      document.removeEventListener('click', recover);
      document.removeEventListener('touchstart', recover);
    };
  }, [autoplayBlocked]);

  // ── Controls ──────────────────────────────────────────────
  const togglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) { playerRef.current.pauseVideo(); setIsPlaying(false); }
      else           { playerRef.current.playVideo();  setIsPlaying(true);  setAutoplayBlocked(false); }
    } catch (err) {
      console.error("Error in togglePlay:", err);
    }
  };

  const handleStop = () => {
    try {
      playerRef.current?.pauseVideo?.();
      playerRef.current?.seekTo?.(0, true);
    } catch (err) {
      console.error("Error in handleStop:", err);
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const prev = () => {
    if (currentTime > 3 && playerRef.current) {
      try {
        playerRef.current.seekTo(0, true);
      } catch (err) {
        console.error("Error in prev seekTo:", err);
      }
      setCurrentTime(0);
    } else {
      setIdx(prev => (prev - 1 + queue.length) % queue.length);
    }
  };

  const next = () => setIdx(prev => (prev + 1) % queue.length);

  const handleSeekStart = () => { isSeeking.current = true; };
  const handleSeekChange = (e) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
  };
  const handleSeekEnd = (e) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    try {
      playerRef.current?.seekTo?.(t, true);
    } catch (err) {
      console.error("Error in handleSeekEnd:", err);
    }
    isSeeking.current = false;
  };

  const handleVolumeChange = (e) => {
    const v = parseInt(e.target.value, 10);
    setVolume(v);
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(isMuted ? 0 : v);
      } catch (err) {
        console.error("Error in handleVolumeChange:", err);
      }
    }
  };

  const toggleMute = () => {
    const m = !isMuted;
    setIsMuted(m);
    try {
      playerRef.current?.setVolume?.(m ? 0 : volume);
    } catch (err) {
      console.error("Error in toggleMute:", err);
    }
  };

  const toggleShuffle = () => {
    setIsShuffled(prev => {
      const next = !prev;
      const base = buildQueue(partnerMusic, myMusic);
      setQueue(next ? shuffle(base) : base);
      setIdx(0);
      return next;
    });
  };

  const cycleRepeat = () => {
    setRepeatMode(prev =>
      prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none'
    );
  };

  const hasAny = queue.length > 0;
  if (!hasAny) return null;

  /* ── Progress fraction 0-1 for CSS gradient ── */
  const progress = duration > 0 ? currentTime / duration : 0;

  /* ─────────────────────────────────────────────
     SHARED EXPANDED PLAYER UI
  ───────────────────────────────────────────── */
  const ExpandedUI = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ff6b8b', display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.06em' }}>
          <Music size={12} /> NHẠC NỀN
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => setShowQueue(v => !v)}
            title="Danh sách phát"
            style={{ background: showQueue ? 'rgba(255,107,139,0.12)' : 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: showQueue ? '#ff6b8b' : '#8c7377', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
          >
            <List size={14} />
          </button>
          {!isDesktop && (
            <button
              onClick={() => setIsExpanded(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="Thu nhỏ"
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Queue list */}
      {showQueue && (
        <div style={{ background: 'rgba(255,107,139,0.04)', borderRadius: '12px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '130px', overflowY: 'auto' }}>
          {queue.map((song, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: i === idx ? 'rgba(255,107,139,0.12)' : 'none',
                border: 'none', borderRadius: '8px', padding: '6px 8px',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid #ffd3da' }}>
                {song.thumbnail
                  ? <img src={song.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#ffd3da,#fff3c4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={12} color="#ff6b8b" /></div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: i === idx ? 800 : 600, color: i === idx ? '#ff6b8b' : '#4a373b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                <p style={{ margin: 0, fontSize: '0.62rem', color: '#8c7377' }}>{song._label}</p>
              </div>
              {i === idx && isPlaying && <Visualizer isPlaying={true} />}
            </button>
          ))}
        </div>
      )}

      {/* Song info */}
      {currentSong && currentSong.source === 'youtube' && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '50%',
            border: '2px solid #ffd3da', overflow: 'hidden', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(255,107,139,0.2)',
            animation: isPlaying ? 'spin 10s linear infinite' : 'none',
            transition: 'animation 0.3s'
          }}>
            {currentSong.thumbnail
              ? <img src={currentSong.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#ffd3da,#fff3c4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={18} color="#ff6b8b" /></div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#3d2e32', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.title}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#8c7377', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSong.artist || 'YouTube'} · {currentSong._label}
            </p>
          </div>
          <Visualizer isPlaying={isPlaying} />
        </div>
      )}

      {currentSong && currentSong.source === 'zing' && (
        <div style={{ borderRadius: '10px', overflow: 'hidden' }}>
          <iframe
            src={`https://mp3.zing.vn/embed/song/${currentSong.id}?start=true`}
            width="100%" height="86" frameBorder="0" allowFullScreen allow="autoplay"
            style={{ display: 'block' }}
          />
        </div>
      )}

      {!currentSong && (
        <p style={{ fontSize: '0.75rem', color: '#c0aab0', fontStyle: 'italic', textAlign: 'center', margin: '6px 0' }}>Chưa có nhạc nào</p>
      )}

      {/* Controls — only for YouTube */}
      {currentSong && currentSong.source === 'youtube' && (
        <>
          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              style={{
                width: '100%',
                height: '4px',
                padding: 0,
                border: 'none',
                background: `linear-gradient(to right, #ff6b8b ${progress * 100}%, rgba(255,107,139,0.18) ${progress * 100}%)`,
                borderRadius: '2px',
                cursor: 'pointer',
                accentColor: '#ff6b8b',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#8c7377', fontWeight: 600 }}>
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {/* Main controls row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              title="Trộn bài"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: isShuffled ? '#ff6b8b' : '#c0aab0', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
            >
              <Shuffle size={15} />
            </button>

            {/* Prev */}
            <button
              onClick={prev}
              disabled={queue.length < 2}
              title="Bài trước"
              style={{ background: 'none', border: 'none', cursor: queue.length < 2 ? 'default' : 'pointer', color: queue.length < 2 ? '#e0cfd2' : '#6b5157', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
            >
              <SkipBack size={20} fill={queue.length < 2 ? '#e0cfd2' : '#6b5157'} />
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              title={isPlaying ? 'Tạm dừng' : 'Phát'}
              style={{
                background: 'linear-gradient(135deg, #ff6b8b, #ff477e)',
                border: 'none', borderRadius: '50%',
                width: '38px', height: '38px',
                color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255,71,126,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                flexShrink: 0,
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" style={{ marginLeft: '2px' }} />}
            </button>

            {/* Next */}
            <button
              onClick={next}
              disabled={queue.length < 2}
              title="Bài tiếp"
              style={{ background: 'none', border: 'none', cursor: queue.length < 2 ? 'default' : 'pointer', color: queue.length < 2 ? '#e0cfd2' : '#6b5157', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
            >
              <SkipForward size={20} fill={queue.length < 2 ? '#e0cfd2' : '#6b5157'} />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              title={repeatMode === 'none' ? 'Lặp lại tất cả' : repeatMode === 'all' ? 'Lặp lại một bài' : 'Tắt lặp'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: repeatMode !== 'none' ? '#ff6b8b' : '#c0aab0', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
            >
              {repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </button>
          </div>

          {/* Volume row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 2px' }}>
            <button
              onClick={toggleMute}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              {isMuted ? <VolumeX size={14} color="#ff6b8b" /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min="0" max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              style={{
                flex: 1, height: '4px', padding: 0, border: 'none',
                background: `linear-gradient(to right, #ff6b8b ${isMuted ? 0 : volume}%, rgba(255,107,139,0.18) ${isMuted ? 0 : volume}%)`,
                borderRadius: '2px', cursor: 'pointer', accentColor: '#ff6b8b',
              }}
            />
            <span style={{ fontSize: '0.62rem', color: '#8c7377', fontWeight: 600, minWidth: '22px', textAlign: 'right' }}>
              {isMuted ? 0 : volume}
            </span>
          </div>
        </>
      )}

      {/* Autoplay blocked banner */}
      {autoplayBlocked && (
        <div style={{
          background: 'rgba(255,243,196,0.9)', border: '1px dashed #e6a100',
          borderRadius: '10px', padding: '7px 10px',
          fontSize: '0.72rem', color: '#b07b00', textAlign: 'center', fontWeight: 600,
          animation: 'pulse 2s infinite'
        }}>
          Chạm vào màn hình để bắt đầu phát nhạc! 🎵
        </div>
      )}
    </div>
  );

  /* ─────────────────────────────────────────────
     RENDER — desktop: inline sidebar card
               mobile:  FAB (collapsed / expanded)
  ───────────────────────────────────────────── */
  return (
    <>
      {/* Hidden YouTube player div — only ONE in DOM */}
      <div id="yt-hidden-player" style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />

      <style>{`
        @keyframes vizBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      {/* ── DESKTOP: inline in sidebar ── */}
      {isDesktop && (
        <div className="glass-card animate-fade-in music-player-sidebar" style={{
          padding: '16px 18px',
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(255,107,139,0.15)',
          boxShadow: '0 8px 28px rgba(255,107,139,0.13)',
          width: '100%',
        }}>
          {ExpandedUI}
        </div>
      )}

      {/* ── MOBILE: floating FAB ── */}
      {!isDesktop && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          right: '12px',
          zIndex: 9999,
        }}>
          <div
            className="glass-card"
            style={{
              padding: showExpanded ? '14px 16px' : '0',
              borderRadius: showExpanded ? '22px' : '50%',
              width: showExpanded ? '300px' : '50px',
              height: showExpanded ? 'auto' : '50px',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(255,107,139,0.18)',
              boxShadow: '0 8px 32px rgba(255,107,139,0.22)',
              transition: 'all 0.38s cubic-bezier(0.34,1.56,0.64,1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: showExpanded ? 'stretch' : 'center',
              justifyContent: showExpanded ? 'flex-start' : 'center',
            }}
          >
            {/* Collapsed FAB button */}
            {!showExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  width: '50px', height: '50px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ff6b8b', position: 'relative',
                }}
                title="Mở nhạc"
              >
                <Disc size={26} style={{ animation: isPlaying ? 'spin 8s linear infinite' : 'none' }} />
                {isPlaying && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '6px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#27ae60', border: '1.5px solid white'
                  }} />
                )}
              </button>
            )}

            {/* Expanded content */}
            {showExpanded && ExpandedUI}
          </div>
        </div>
      )}
    </>
  );
}
