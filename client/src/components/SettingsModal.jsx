import React, { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'hôm nay';
  if (d === 1) return 'hôm qua';
  return `${d} ngày trước`;
}

export default function SettingsModal({ apiBase, token, onClose, onRestored, user, onUserUpdate }) {
  const [tab, setTab]           = useState('trash');
  const [trashPosts, setTrash]  = useState([]);
  const [loading, setLoading]   = useState(false);
  const [restoring, setRestoring] = useState(null);

  // Animation states
  const [active, setActive]     = useState(false);
  const [closing, setClosing]   = useState(false);

  useEffect(() => {
    // Trigger entry animation
    const raf = requestAnimationFrame(() => {
      setActive(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setActive(false);
    setTimeout(() => {
      onClose();
    }, 280); // matches the transition duration in CSS
  };

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/posts/trash`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTrash(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'trash') fetchTrash(); }, [tab]);

  const handleRestore = async (postId) => {
    setRestoring(postId);
    try {
      const res = await fetch(`${apiBase}/api/posts/${postId}/restore`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const post = await res.json();
        setTrash(prev => prev.filter(p => String(p._id) !== String(postId)));
        onRestored?.(post);
      }
    } catch {}
    finally { setRestoring(null); }
  };

  const TABS = [
    { id: 'trash', label: '🗑️ Thùng rác' },
    { id: 'music', label: '🎵 Nhạc nền' }
  ];

  return createPortal(
    <div className={`bottom-sheet-backdrop ${active ? 'active' : ''}`}>
      <div
        className="bottom-sheet-content glass-card"
        style={{
          boxShadow: '0 -8px 48px rgba(255,107,139,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚙️</span>
            <span style={{ fontWeight: 800, color: '#ff6b8b', fontSize: '1.05rem' }}>Cài đặt</span>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377' }}><X size={22} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '14px 20px 0', borderBottom: '1px solid rgba(255,107,139,0.1)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                background: tab === t.id ? 'linear-gradient(135deg, #ff6b8b, #ff477e)' : 'rgba(255,107,139,0.08)',
                color: tab === t.id ? '#fff' : '#8c7377',
                transition: 'all 0.2s',
                marginBottom: '12px',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {tab === 'trash' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#8c7377' }}>
                  Bài viết đã xóa — có thể khôi phục bất cứ lúc nào
                </p>
                <button onClick={fetchTrash} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377' }}>
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {loading && (
                <div style={{ textAlign: 'center', padding: '32px', color: '#8c7377' }}>
                  <RefreshCw size={28} className="animate-spin" color="#ffd3da" />
                </div>
              )}

              {!loading && trashPosts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Trash2 size={40} color="#ffd3da" style={{ marginBottom: '12px' }} />
                  <p style={{ color: '#8c7377', fontSize: '0.9rem', fontWeight: 600 }}>Thùng rác trống</p>
                  <p style={{ color: '#c0aab0', fontSize: '0.8rem', marginTop: '4px' }}>Các bài viết đã xóa sẽ xuất hiện ở đây</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {trashPosts.map(post => (
                  <div
                    key={post._id}
                    style={{
                      display: 'flex', gap: '12px', alignItems: 'center',
                      background: 'rgba(255,107,139,0.04)',
                      border: '1px solid rgba(255,107,139,0.1)',
                      borderRadius: '16px', padding: '12px',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: '#f5e6e9' }}>
                      {post.imageUrl
                        ? <img src={post.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={24} color="#ffd3da" /></div>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#4a373b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {post.caption || 'Không có chú thích'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#8c7377' }}>
                        Bởi {post.sender?.displayName} · Xóa {timeAgo(post.deletedAt)}
                      </p>
                    </div>

                    {/* Restore button */}
                    <button
                      onClick={() => handleRestore(String(post._id))}
                      disabled={restoring === String(post._id)}
                      style={{
                        flexShrink: 0, padding: '8px 12px',
                        background: 'linear-gradient(135deg, #ff6b8b, #ff477e)',
                        border: 'none', borderRadius: '12px',
                        color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.78rem', fontWeight: 700,
                        opacity: restoring === String(post._id) ? 0.6 : 1,
                      }}
                    >
                      <RotateCcw size={13} /> Khôi phục
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'music' && user && (
            <MusicSettings
              apiBase={apiBase}
              token={token}
              user={user}
              onUserUpdate={onUserUpdate}
            />
          )}
        </div>
      </div>
      {/* Backdrop click to close */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: -1 }}
        onClick={handleClose}
      />
    </div>
    , document.body);
}

// ── Music Settings Subcomponent ───────────────────────────────────────────
function MusicSettings({ apiBase, token, user, onUserUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [pastedLink, setPastedLink] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: '' }

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`${apiBase}/api/youtube/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Không thể tìm kiếm nhạc', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSearching(false);
    }
  };

  const saveMusic = async (musicObj) => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/user/music`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ music: musicObj })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update user state locally
        onUserUpdate?.({ ...user, music: data.music });
        showToast(musicObj ? 'Đã cài nhạc nền cho đối phương! 🎵' : 'Đã gỡ nhạc nền.');
      } else {
        showToast('Không thể cập nhật nhạc', 'error');
      }
    } catch (err) {
      showToast('Lỗi mạng, vui lòng thử lại', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPasted = () => {
    const parsed = parseMusicInput(pastedLink);
    if (!parsed) {
      showToast('Link không đúng định dạng YouTube hoặc ZingMP3!', 'error');
      return;
    }

    const musicObj = {
      source: parsed.source,
      id: parsed.id,
      title: customTitle.trim() || (parsed.source === 'youtube' ? 'YouTube Music Video' : 'ZingMP3 Song'),
      artist: customArtist.trim() || (parsed.source === 'youtube' ? 'YouTube' : 'ZingMP3'),
      thumbnail: parsed.source === 'youtube' ? `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg` : '',
      url: pastedLink.trim()
    };

    saveMusic(musicObj);
    // Clear inputs
    setPastedLink('');
    setCustomTitle('');
    setCustomArtist('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Toast Feedback */}
      {toast && (
        <div className={`sweet-alert sweet-alert-${toast.type === 'error' ? 'error' : 'success'} animate-fade-in`}>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Current Selection Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '0.88rem', color: '#ff6b8b', fontWeight: 800 }}>🎶 TRẠNG THÁI NHẠC NỀN</h4>
        
        {/* User's music for partner */}
        <div className="glass-card" style={{ padding: '14px', border: '1px solid rgba(255,107,139,0.15)', background: 'rgba(255,255,255,0.4)' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#8c7377', fontWeight: 700 }}>
            Nhạc bạn đang chọn cho đối phương:
          </p>
          {user.music ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fdf0f2', flexShrink: 0 }}>
                {user.music.thumbnail ? (
                  <img src={user.music.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b8b', background: '#ffeef0' }}>
                    <RefreshCw size={18} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#4a373b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.music.title}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#8c7377', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.music.artist} • <span style={{ textTransform: 'uppercase', color: '#ff6b8b', fontWeight: 700 }}>{user.music.source}</span>
                </p>
              </div>
              <button
                disabled={saving}
                onClick={() => saveMusic(null)}
                style={{
                  padding: '6px 12px', border: '1px solid #ffd3da', borderRadius: '10px', background: 'none',
                  color: '#ff6b8b', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Gỡ nhạc
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#c0aab0', fontStyle: 'italic' }}>Chưa chọn nhạc nào. Đối phương sẽ không nghe thấy nhạc khi đăng nhập.</p>
          )}
        </div>

        {/* Partner's music for user */}
        <div className="glass-card" style={{ padding: '14px', border: '1px solid rgba(255,107,139,0.15)', background: 'rgba(255,255,255,0.4)' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#8c7377', fontWeight: 700 }}>
            Nhạc đối phương đang chọn cho bạn (bạn đang nghe):
          </p>
          {user.partnerId?.music ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fdf0f2', flexShrink: 0 }}>
                {user.partnerId.music.thumbnail ? (
                  <img src={user.partnerId.music.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b8b', background: '#ffeef0' }}>
                    <RefreshCw size={18} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#4a373b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.partnerId.music.title}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#8c7377', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.partnerId.music.artist} • <span style={{ textTransform: 'uppercase', color: '#ff6b8b', fontWeight: 700 }}>{user.partnerId.music.source}</span>
                </p>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#c0aab0', fontStyle: 'italic' }}>Đối phương chưa cài bài hát nào cho bạn.</p>
          )}
        </div>
      </div>

      {/* Option 1: Search YouTube */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '0.88rem', color: '#ff6b8b', fontWeight: 800 }}>🔍 TÌM KIẾM NHẠC TRÊN YOUTUBE</h4>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Nhập tên bài hát, ca sĩ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem' }}
          />
          <button
            type="submit"
            disabled={searching}
            style={{
              padding: '10px 18px', border: 'none', borderRadius: '12px',
              background: 'linear-gradient(135deg, #ff6b8b, #ff477e)', color: 'white',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            {searching ? 'Tìm...' : 'Tìm'}
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: '10px',
              maxHeight: '260px', overflowY: 'auto', paddingRight: '4px',
              border: '1px solid rgba(255,107,139,0.1)', borderRadius: '14px',
              padding: '8px', backgroundColor: 'rgba(255,107,139,0.02)'
            }}
          >
            {searchResults.map((video) => (
              <div
                key={video.id}
                style={{
                  display: 'flex', gap: '10px', alignItems: 'center',
                  padding: '8px', borderRadius: '10px', backgroundColor: 'white',
                  border: '1px solid rgba(255,107,139,0.05)'
                }}
              >
                <div style={{ width: '56px', height: '42px', borderRadius: '6px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                  <img src={video.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', bottom: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', fontSize: '0.6rem', padding: '1px 3px', borderRadius: '2px' }}>
                    {video.duration}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#4a373b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {video.title}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#8c7377', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {video.channel}
                  </p>
                </div>
                <button
                  disabled={saving}
                  onClick={() => saveMusic({
                    source: 'youtube',
                    id: video.id,
                    title: video.title,
                    artist: video.channel,
                    thumbnail: video.thumbnail,
                    url: video.url
                  })}
                  style={{
                    padding: '6px 10px', border: 'none', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ff6b8b, #ff477e)', color: 'white',
                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Chọn
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Option 2: Paste Link */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '0.88rem', color: '#ff6b8b', fontWeight: 800 }}>🔗 DÁN LINK YOUTUBE HOẶC ZINGMP3</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="text"
            placeholder="Link bài hát YouTube hoặc ZingMP3..."
            value={pastedLink}
            onChange={(e) => setPastedLink(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem' }}
          />
          {pastedLink.trim() && (
            <div className="animate-fade-in" style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Tên bài hát (Không bắt buộc)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem' }}
              />
              <input
                type="text"
                placeholder="Ca sĩ (Không bắt buộc)"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem' }}
              />
            </div>
          )}
          <button
            type="button"
            disabled={saving || !pastedLink.trim()}
            onClick={handleApplyPasted}
            style={{
              padding: '10px', border: 'none', borderRadius: '12px',
              background: pastedLink.trim() ? 'linear-gradient(135deg, #ff6b8b, #ff477e)' : '#e0d8da',
              color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: pastedLink.trim() ? 'pointer' : 'default'
            }}
          >
            Áp dụng link
          </button>
        </div>
      </div>

    </div>
  );
}

// ── Link Parsing Helper ───────────────────────────────────────────────────
function parseMusicInput(input) {
  if (!input) return null;
  const str = input.trim();
  
  // YouTube URL regex
  const ytMatch = str.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return { source: 'youtube', id: ytMatch[1] };
  }
  
  // ZingMP3 URL regex
  const zingMatch = str.match(/zingmp3\.vn\/bai-hat\/[^\/]+\/([A-Z0-9]{8})\.html/i) || str.match(/\b([A-Z0-9]{8})\b/i);
  if (zingMatch && zingMatch[1]) {
    return { source: 'zing', id: zingMatch[1] };
  }
  
  // YouTube 11-character video ID
  if (str.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return { source: 'youtube', id: str };
  }
  
  return null;
}

