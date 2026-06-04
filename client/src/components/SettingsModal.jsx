import React, { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, Image as ImageIcon, RefreshCw, Plus, Edit2, Check, ChevronRight, ChevronDown, ListMusic, Play, Music } from 'lucide-react';
import { createPortal } from 'react-dom';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'hôm nay';
  if (d === 1) return 'hôm qua';
  return `${d} ngày trước`;
}

export default function SettingsModal({ apiBase, token, onClose, onRestored, user, onUserUpdate, heartsEnabled, onToggleHearts, brushEnabled, onToggleBrush }) {
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
    { id: 'music', label: '🎵 Nhạc nền' },
    { id: 'display', label: '✨ Hiển thị' }
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

          {tab === 'display' && (
            <DisplaySettings
              heartsEnabled={heartsEnabled}
              onToggleHearts={onToggleHearts}
              brushEnabled={brushEnabled}
              onToggleBrush={onToggleBrush}
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

// ── Display Settings Subcomponent ─────────────────────────────────────────
function DisplaySettings({ heartsEnabled, onToggleHearts, brushEnabled, onToggleBrush }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h4 style={{ fontSize: '0.88rem', color: '#ff6b8b', fontWeight: 800 }}>✨ HIỆU ỨNG HIỂN THỊ</h4>

      {/* Toggle hearts */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          background: 'rgba(255,107,139,0.04)',
          border: '1px solid rgba(255,107,139,0.12)',
          borderRadius: '16px',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#4a373b' }}>
            ❤️ Trái tim bay
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#8c7377' }}>
            Hiệu ứng trái tim bay trên màn hình
          </p>
        </div>
        <button
          onClick={() => onToggleHearts?.(!heartsEnabled)}
          style={{
            width: '48px',
            height: '26px',
            borderRadius: '13px',
            border: 'none',
            cursor: 'pointer',
            background: heartsEnabled
              ? 'linear-gradient(135deg, #ff6b8b, #ff477e)'
              : 'rgba(0,0,0,0.15)',
            position: 'relative',
            transition: 'background 0.25s ease',
            flexShrink: 0,
          }}
          title={heartsEnabled ? 'Tắt trái tim bay' : 'Bật trái tim bay'}
        >
          <span
            style={{
              position: 'absolute',
              top: '3px',
              left: heartsEnabled ? '25px' : '3px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              transition: 'left 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </button>
      </div>

      {/* Toggle brush */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          background: 'rgba(255,107,139,0.04)',
          border: '1px solid rgba(255,107,139,0.12)',
          borderRadius: '16px',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#4a373b' }}>
            🖌️ Bàn chải Batman
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#8c7377' }}>
            Bật/tắt bàn chải Batman để tương tác vẽ tranh
          </p>
        </div>
        <button
          onClick={() => onToggleBrush?.(!brushEnabled)}
          style={{
            width: '48px',
            height: '26px',
            borderRadius: '13px',
            border: 'none',
            cursor: 'pointer',
            background: brushEnabled
              ? 'linear-gradient(135deg, #ff6b8b, #ff477e)'
              : 'rgba(0,0,0,0.15)',
            position: 'relative',
            transition: 'background 0.25s ease',
            flexShrink: 0,
          }}
          title={brushEnabled ? 'Tắt bàn chải Batman' : 'Bật bàn chải Batman'}
        >
          <span
            style={{
              position: 'absolute',
              top: '3px',
              left: brushEnabled ? '25px' : '3px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              transition: 'left 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </button>
      </div>

      <p style={{ fontSize: '0.75rem', color: '#c0aab0', textAlign: 'center' }}>
        Cài đặt hiển thị được lưu tự động
      </p>
    </div>
  );
}

// ── Music Settings Subcomponent ───────────────────────────────────────────
function MusicSettings({ apiBase, token, user, onUserUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [pastedLink, setPastedLink] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  
  const [savingMusic, setSavingMusic] = useState(false);   // for music background updates
  const [savingPlaylist, setSavingPlaylist] = useState(false); // for playlist operations
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: '' }

  // Playlists States
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [partnerPlaylists, setPartnerPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState('');

  // Accordion states
  const [expandedAccordion, setExpandedAccordion] = useState('mine'); // 'mine' | 'partner' | null
  const [expandedPlaylists, setExpandedPlaylists] = useState({}); // { playlistId: boolean }

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const res = await fetch(`${apiBase}/api/user/playlists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyPlaylists(data.myPlaylists || []);
        setPartnerPlaylists(data.partnerPlaylists || []);
      }
    } catch (err) {
      console.error('Fetch playlists error:', err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setSavingPlaylist(true);
    try {
      const res = await fetch(`${apiBase}/api/user/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newPlaylistName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setMyPlaylists(data);
        setNewPlaylistName('');
        showToast('Đã tạo danh sách phát mới!');
      } else {
        const err = await res.json();
        showToast(err.message || 'Không thể tạo danh sách phát', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingPlaylist(false);
    }
  };

  const renamePlaylist = async (playlistId) => {
    if (!editingPlaylistName.trim()) return;
    setSavingPlaylist(true);
    try {
      const res = await fetch(`${apiBase}/api/user/playlists/${playlistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editingPlaylistName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setMyPlaylists(data);
        setEditingPlaylistId(null);
        setEditingPlaylistName('');
        showToast('Đã đổi tên danh sách phát!');
      } else {
        const err = await res.json();
        showToast(err.message || 'Không thể đổi tên', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingPlaylist(false);
    }
  };

  const deletePlaylist = async (playlistId) => {
    if (!window.confirm('Bạn có chắc muốn xóa danh sách phát này không?')) return;
    setSavingPlaylist(true);
    try {
      const res = await fetch(`${apiBase}/api/user/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyPlaylists(data);
        showToast('Đã xóa danh sách phát.');
      } else {
        const err = await res.json();
        showToast(err.message || 'Không thể xóa', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingPlaylist(false);
    }
  };

  const addSongToPlaylist = async (playlistId, songObj) => {
    setSavingPlaylist(true);
    try {
      const res = await fetch(`${apiBase}/api/user/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ song: songObj })
      });
      if (res.ok) {
        const data = await res.json();
        setMyPlaylists(data);
        showToast('Đã thêm bài hát vào danh sách phát! 🎵');
      } else {
        const err = await res.json();
        showToast(err.message || 'Bài hát đã có trong danh sách hoặc lỗi', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingPlaylist(false);
    }
  };

  const removeSongFromPlaylist = async (playlistId, songId) => {
    setSavingPlaylist(true);
    try {
      const res = await fetch(`${apiBase}/api/user/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyPlaylists(data);
        showToast('Đã xóa bài hát khỏi danh sách phát.');
      } else {
        const err = await res.json();
        showToast(err.message || 'Không thể xóa bài hát', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingPlaylist(false);
    }
  };

  const handleAddPastedToPlaylist = (playlistId) => {
    const parsed = parseMusicInput(pastedLink);
    if (!parsed) {
      showToast('Link không đúng định dạng YouTube hoặc ZingMP3!', 'error');
      return;
    }

    const songObj = {
      source: parsed.source,
      id: parsed.id,
      title: customTitle.trim() || (parsed.source === 'youtube' ? 'YouTube Music Video' : 'ZingMP3 Song'),
      artist: customArtist.trim() || (parsed.source === 'youtube' ? 'YouTube' : 'ZingMP3'),
      thumbnail: parsed.source === 'youtube' ? `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg` : '',
      url: pastedLink.trim()
    };

    addSongToPlaylist(playlistId, songObj);
    
    // Clear inputs
    setPastedLink('');
    setCustomTitle('');
    setCustomArtist('');
  };

  const togglePlaylistExpand = (playlistId) => {
    setExpandedPlaylists(prev => ({
      ...prev,
      [playlistId]: !prev[playlistId]
    }));
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
    setSavingMusic(true);
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
      setSavingMusic(false);
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
        <div className="glass-card" style={{ padding: '14px', border: '1px solid rgba(255,107,139,0.15)', background: 'rgba(255,255,255,0.4)', borderRadius: '16px' }}>
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
                disabled={savingMusic}
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
        <div className="glass-card" style={{ padding: '14px', border: '1px solid rgba(255,107,139,0.15)', background: 'rgba(255,255,255,0.4)', borderRadius: '16px' }}>
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

      {/* Playlists Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '0.88rem', color: '#ff6b8b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ListMusic size={16} /> DANH SÁCH PHÁT CỦA CẶP ĐÔI
        </h4>

        {/* Section Accordions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Mine Playlists */}
          <div className="glass-card" style={{ border: '1px solid rgba(255,107,139,0.15)', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', overflow: 'hidden' }}>
            <button
              onClick={() => setExpandedAccordion(expandedAccordion === 'mine' ? null : 'mine')}
              style={{
                width: '100%',
                padding: '14px',
                background: 'none',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#4a373b',
                fontSize: '0.82rem'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                👤 Danh sách của bạn ({myPlaylists.length})
              </span>
              {expandedAccordion === 'mine' ? <ChevronDown size={16} color="#ff6b8b" /> : <ChevronRight size={16} color="#ff6b8b" />}
            </button>

            {expandedAccordion === 'mine' && (
              <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid rgba(255,107,139,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Create Playlist Form */}
                <form onSubmit={createPlaylist} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="text"
                    placeholder="Tên danh sách phát mới..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      border: '1px solid rgba(255,107,139,0.2)',
                      outline: 'none',
                      background: 'white'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={savingPlaylist || !newPlaylistName.trim()}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '10px',
                      background: newPlaylistName.trim() ? 'linear-gradient(135deg, #ff6b8b, #ff477e)' : '#e0d8da',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: newPlaylistName.trim() ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Tạo
                  </button>
                </form>

                {/* Playlists List */}
                {loadingPlaylists ? (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#8c7377', fontSize: '0.8rem' }}>Đang tải danh sách phát...</div>
                ) : myPlaylists.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: '#c0aab0', fontStyle: 'italic', margin: '8px 0' }}>Chưa có danh sách phát nào.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {myPlaylists.map((playlist) => {
                      const isPlaylistExpanded = !!expandedPlaylists[playlist._id];
                      const isEditing = editingPlaylistId === playlist._id;

                      return (
                        <div
                          key={playlist._id}
                          style={{
                            background: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(255,107,139,0.1)',
                            borderRadius: '12px',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Playlist Header */}
                          <div
                            style={{
                              padding: '10px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: 'rgba(255,107,139,0.03)'
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '6px', flex: 1, marginRight: '8px' }}>
                                <input
                                  type="text"
                                  value={editingPlaylistName}
                                  onChange={(e) => setEditingPlaylistName(e.target.value)}
                                  style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #ff6b8b',
                                    outline: 'none'
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => renamePlaylist(playlist._id)}
                                  disabled={savingPlaylist || !editingPlaylistName.trim()}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#27ae60',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPlaylistId(null);
                                    setEditingPlaylistName('');
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#7f8c8d',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => togglePlaylistExpand(playlist._id)}
                                style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}
                              >
                                {isPlaylistExpanded ? <ChevronDown size={14} color="#8c7377" /> : <ChevronRight size={14} color="#8c7377" />}
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4a373b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {playlist.name}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#8c7377' }}>({playlist.songs.length} bài)</span>
                              </div>
                            )}

                            {!isEditing && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => {
                                    setEditingPlaylistId(playlist._id);
                                    setEditingPlaylistName(playlist.name);
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377', padding: '4px' }}
                                  title="Đổi tên"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => deletePlaylist(playlist._id)}
                                  disabled={myPlaylists.length <= 1}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: myPlaylists.length <= 1 ? 'not-allowed' : 'pointer',
                                    color: myPlaylists.length <= 1 ? '#c0aab0' : '#e74c3c',
                                    padding: '4px',
                                    opacity: myPlaylists.length <= 1 ? 0.4 : 1
                                  }}
                                  title="Xóa danh sách"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Playlist Songs */}
                          {isPlaylistExpanded && (
                            <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,107,139,0.06)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {playlist.songs.length === 0 ? (
                                <p style={{ fontSize: '0.72rem', color: '#c0aab0', fontStyle: 'italic', textAlign: 'center', margin: '8px 0' }}>Chưa có bài hát nào trong danh sách này.</p>
                              ) : (
                                playlist.songs.map((song) => (
                                  <div
                                    key={song._id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '6px',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(255,255,255,0.7)',
                                      border: '1px solid rgba(255,107,139,0.05)'
                                    }}
                                  >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#fdf0f2' }}>
                                      {song.thumbnail ? (
                                        <img src={song.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffeef0' }}>
                                          <Music size={12} color="#ff6b8b" />
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#4a373b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {song.title}
                                      </p>
                                      <p style={{ margin: 0, fontSize: '0.65rem', color: '#8c7377', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {song.artist}
                                      </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                      <button
                                        onClick={() => saveMusic(song)}
                                        style={{
                                          padding: '4px 6px',
                                          border: 'none',
                                          borderRadius: '6px',
                                          background: 'linear-gradient(135deg, #ff6b8b, #ff477e)',
                                          color: 'white',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '0.62rem',
                                          fontWeight: 700
                                        }}
                                        title="Phát & Cài làm nhạc nền"
                                      >
                                        <Play size={10} fill="white" />
                                      </button>
                                      <button
                                        onClick={() => removeSongFromPlaylist(playlist._id, song._id)}
                                        style={{
                                          padding: '4px 6px',
                                          border: '1px solid #ffd3da',
                                          borderRadius: '6px',
                                          background: 'none',
                                          color: '#ff6b8b',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center'
                                        }}
                                        title="Xóa khỏi danh sách"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Partner Playlists */}
          <div className="glass-card" style={{ border: '1px solid rgba(255,107,139,0.15)', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', overflow: 'hidden' }}>
            <button
              onClick={() => setExpandedAccordion(expandedAccordion === 'partner' ? null : 'partner')}
              style={{
                width: '100%',
                padding: '14px',
                background: 'none',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#4a373b',
                fontSize: '0.82rem'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                💖 Danh sách của đối phương ({partnerPlaylists.length})
              </span>
              {expandedAccordion === 'partner' ? <ChevronDown size={16} color="#ff6b8b" /> : <ChevronRight size={16} color="#ff6b8b" />}
            </button>

            {expandedAccordion === 'partner' && (
              <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid rgba(255,107,139,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loadingPlaylists ? (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#8c7377', fontSize: '0.8rem', marginTop: '12px' }}>Đang tải danh sách phát...</div>
                ) : partnerPlaylists.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: '#c0aab0', fontStyle: 'italic', margin: '12px 0 0 0' }}>Đối phương chưa có danh sách phát nào.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {partnerPlaylists.map((playlist) => {
                      const isPlaylistExpanded = !!expandedPlaylists[playlist._id];

                      return (
                        <div
                          key={playlist._id}
                          style={{
                            background: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(255,107,139,0.1)',
                            borderRadius: '12px',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Playlist Header */}
                          <div
                            onClick={() => togglePlaylistExpand(playlist._id)}
                            style={{
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              background: 'rgba(255,107,139,0.03)'
                            }}
                          >
                            {isPlaylistExpanded ? <ChevronDown size={14} color="#8c7377" /> : <ChevronRight size={14} color="#8c7377" />}
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4a373b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {playlist.name}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#8c7377' }}>({playlist.songs.length} bài)</span>
                          </div>

                          {/* Playlist Songs */}
                          {isPlaylistExpanded && (
                            <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,107,139,0.06)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {playlist.songs.length === 0 ? (
                                <p style={{ fontSize: '0.72rem', color: '#c0aab0', fontStyle: 'italic', textAlign: 'center', margin: '8px 0' }}>Chưa có bài hát nào trong danh sách này.</p>
                              ) : (
                                playlist.songs.map((song) => (
                                  <div
                                    key={song._id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '6px',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(255,255,255,0.7)',
                                      border: '1px solid rgba(255,107,139,0.05)'
                                    }}
                                  >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#fdf0f2' }}>
                                      {song.thumbnail ? (
                                        <img src={song.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffeef0' }}>
                                          <Music size={12} color="#ff6b8b" />
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#4a373b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {song.title}
                                      </p>
                                      <p style={{ margin: 0, fontSize: '0.65rem', color: '#8c7377', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {song.artist}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => saveMusic(song)}
                                      style={{
                                        padding: '4px 8px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        background: 'linear-gradient(135deg, #ff6b8b, #ff477e)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        flexShrink: 0
                                      }}
                                      title="Phát & Cài làm nhạc nền"
                                    >
                                      <Play size={10} fill="white" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
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
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    disabled={savingMusic}
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
                  {myPlaylists.length > 0 && (
                    <select
                      defaultValue=""
                      disabled={savingPlaylist}
                      onChange={(e) => {
                        const pId = e.target.value;
                        if (pId) {
                          addSongToPlaylist(pId, {
                            source: 'youtube',
                            id: video.id,
                            title: video.title,
                            artist: video.channel,
                            thumbnail: video.thumbnail,
                            url: video.url
                          });
                          e.target.value = ""; // Reset
                        }
                      }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,107,139,0.2)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: 'white',
                        color: '#ff6b8b',
                        cursor: 'pointer',
                        outline: 'none',
                        maxWidth: '90px'
                      }}
                    >
                      <option value="" disabled>➕ Lưu...</option>
                      {myPlaylists.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={savingMusic || !pastedLink.trim()}
              onClick={handleApplyPasted}
              style={{
                flex: 1,
                padding: '10px', border: 'none', borderRadius: '12px',
                background: pastedLink.trim() ? 'linear-gradient(135deg, #ff6b8b, #ff477e)' : '#e0d8da',
                color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: pastedLink.trim() ? 'pointer' : 'default'
              }}
            >
              Cài nhạc nền
            </button>
            {pastedLink.trim() && myPlaylists.length > 0 && (
              <select
                defaultValue=""
                disabled={savingPlaylist}
                onChange={(e) => {
                  const pId = e.target.value;
                  if (pId) {
                    handleAddPastedToPlaylist(pId);
                    e.target.value = ""; // Reset
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,107,139,0.2)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: 'white',
                  color: '#ff6b8b',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="" disabled>➕ Lưu vào...</option>
                {myPlaylists.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
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

