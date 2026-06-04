import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Disc, ChevronUp, ChevronDown } from 'lucide-react';

export default function MusicPlayer({ partnerMusic }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  
  const playerRef = useRef(null); // YouTube player instance
  const iframeApiLoadedRef = useRef(false);
  const playAttemptsRef = useRef(0);
  
  // Track if music is currently loaded
  const hasMusic = !!partnerMusic;

  // ── YouTube API Setup ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMusic || partnerMusic.source !== 'youtube') {
      // Clean up player if music type changes or is removed
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    // Inject YouTube IFrame API script if not loaded
    if (!window.YT) {
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }

    let intervalId;
    const initYTPlayer = () => {
      if (window.YT && window.YT.Player) {
        clearInterval(intervalId);
        
        // If player already exists, just load the new video ID
        if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById({
            videoId: partnerMusic.id,
            suggestedQuality: 'small'
          });
          playerRef.current.setVolume(isMuted ? 0 : volume);
          return;
        }

        // Create player
        playerRef.current = new window.YT.Player('youtube-hidden-player', {
          height: '0',
          width: '0',
          videoId: partnerMusic.id,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            loop: 1,
            playlist: partnerMusic.id
          },
          events: {
            onReady: (event) => {
              event.target.setVolume(isMuted ? 0 : volume);
              attemptPlay(event.target);
            },
            onStateChange: (event) => {
              // event.data: 1 = playing, 2 = paused
              if (event.data === 1) {
                setIsPlaying(true);
                setAutoplayBlocked(false);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                // Loop video manually if it ends
                event.target.playVideo();
              }
            }
          }
        });
      }
    };

    intervalId = setInterval(initYTPlayer, 200);

    return () => {
      clearInterval(intervalId);
    };
  }, [partnerMusic?.id, partnerMusic?.source]);

  // Attempt to play and check for autoplay block
  const attemptPlay = (player) => {
    if (!player || typeof player.playVideo !== 'function') return;
    
    // Play video
    player.playVideo();
    
    // Check if playing state changes shortly after
    setTimeout(() => {
      const state = player.getPlayerState();
      // If not playing, it was likely blocked by browser
      if (state !== 1) {
        setAutoplayBlocked(true);
        setIsPlaying(false);
      } else {
        setAutoplayBlocked(false);
        setIsPlaying(true);
      }
    }, 1000);
  };

  // ── Autoplay Recovery Listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!autoplayBlocked || !hasMusic || partnerMusic.source !== 'youtube') return;

    const handleInteraction = () => {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
        setAutoplayBlocked(false);
        setIsPlaying(true);
      }
    };

    // Listen on document for any user clicks or touches
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [autoplayBlocked, hasMusic, partnerMusic?.source]);

  // Handle Play/Pause toggles
  const togglePlay = () => {
    if (partnerMusic.source === 'youtube' && playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
        setAutoplayBlocked(false);
      }
    }
  };

  // Handle Volume slider
  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(isMuted ? 0 : val);
    }
  };

  // Handle Mute/Unmute
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(newMuted ? 0 : volume);
    }
  };

  if (!hasMusic) return null;

  return (
    <>
      {/* Hidden container for YouTube Player API */}
      <div id="youtube-hidden-player" style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}></div>

      {/* Floating UI Widget */}
      <div
        className="glass-card animate-fade-in"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          padding: isExpanded ? '16px' : '10px',
          borderRadius: isExpanded ? '24px' : '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isExpanded ? '12px' : '0',
          boxShadow: '0 8px 32px rgba(255, 107, 139, 0.25)',
          border: '1.5px solid rgba(255, 107, 139, 0.2)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          width: isExpanded ? '280px' : '52px',
          height: isExpanded ? 'auto' : '52px',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
      >
        {/* Collapsed Mode Button */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: '#ff6b8b',
              position: 'relative'
            }}
            title="Mở trình phát nhạc"
          >
            <Disc
              size={26}
              style={{
                animation: isPlaying ? 'spin 5s linear infinite' : 'none',
                transition: 'transform 0.3s'
              }}
            />
            {isPlaying && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#27ae60',
                  border: '1.5px solid white'
                }}
              />
            )}
          </button>
        )}

        {/* Expanded Mode Player Card */}
        {isExpanded && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Header Control */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ff6b8b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Music size={12} /> NHẠC NỀN DÀNH CHO BẠN
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8c7377',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Thu nhỏ"
              >
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Song Details */}
            {partnerMusic.source === 'youtube' ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Rotating Vinyl/Thumbnail */}
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: '2px solid #ffd3da',
                    overflow: 'hidden',
                    flexShrink: 0,
                    animation: isPlaying ? 'spin 12s linear infinite' : 'none',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {partnerMusic.thumbnail ? (
                    <img src={partnerMusic.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #ffd3da, #fff3c4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music size={20} color="#ff6b8b" />
                    </div>
                  )}
                </div>

                {/* Text Metadata */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#4a373b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {partnerMusic.title}
                  </p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: '0.72rem',
                      color: '#8c7377',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {partnerMusic.artist || 'YouTube Video'}
                  </p>
                </div>
              </div>
            ) : (
              /* ZingMP3 Iframe Embed Mode */
              <div
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#f8f9fa',
                  border: '1px solid rgba(255,107,139,0.1)'
                }}
              >
                <iframe
                  src={`https://mp3.zing.vn/embed/song/${partnerMusic.id}?start=true`}
                  width="100%"
                  height="90"
                  frameBorder="0"
                  allowFullScreen={true}
                  allow="autoplay"
                  style={{ display: 'block' }}
                ></iframe>
              </div>
            )}

            {/* Custom Controls (Only for YouTube source since we can command it via postMessage API) */}
            {partnerMusic.source === 'youtube' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                
                {/* Visualizer & Play Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                  {/* CSS Bouncing Visualizer Bars */}
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '16px', width: '40px' }}>
                    {[1, 2, 3, 4, 5].map((bar) => {
                      const heights = [6, 14, 8, 16, 10];
                      const delay = [0.1, 0.4, 0.2, 0.5, 0.3];
                      return (
                        <div
                          key={bar}
                          style={{
                            width: '4px',
                            backgroundColor: '#ff6b8b',
                            borderRadius: '2px',
                            height: isPlaying ? '100%' : '4px',
                            animation: isPlaying ? 'visualizerBar 1.2s ease-in-out infinite alternate' : 'none',
                            animationDelay: `${delay[bar - 1]}s`,
                            // Dynamic target height from variable array
                            maxHeight: `${heights[bar - 1]}px`
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Play/Pause Button */}
                  <button
                    onClick={togglePlay}
                    style={{
                      background: 'linear-gradient(135deg, #ff6b8b, #ff477e)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 3px 8px rgba(255, 71, 126, 0.3)'
                    }}
                  >
                    {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" style={{ marginLeft: '2px' }} />}
                  </button>

                  <div style={{ width: '40px' }} /> {/* Spacer */}
                </div>

                {/* Volume Controller */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                  <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377', padding: '2px' }}>
                    {isMuted ? <VolumeX size={15} color="#ff6b8b" /> : <Volume2 size={15} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(255, 107, 139, 0.2)',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      outline: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      border: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Autoplay blocked tooltip banner */}
            {autoplayBlocked && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 243, 196, 0.85)',
                  border: '1px dashed #e6a100',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  fontSize: '0.72rem',
                  color: '#b07b00',
                  textAlign: 'center',
                  fontWeight: 600,
                  lineHeight: 1.3,
                  animation: 'pulse 2s infinite'
                }}
              >
                Chạm vào màn hình để bắt đầu phát nhạc nền! 🎵
              </div>
            )}

          </div>
        )}
      </div>

      {/* Embedded visualizer keyframe animation block */}
      <style>{`
        @keyframes visualizerBar {
          0% { height: 4px; }
          100% { height: 100%; }
        }
      `}</style>
    </>
  );
}
