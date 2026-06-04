import React, { useState, useEffect, useRef } from 'react';
import { LogOut, RefreshCw, Heart, Sparkles, Camera, Settings } from 'lucide-react';
import Auth from './components/Auth';
import ConnectPartner from './components/ConnectPartner';
import CoupleWidget from './components/CoupleWidget';
import LocketFrame from './components/LocketFrame';
import MomentCard from './components/MomentCard';
import FloatingHearts from './components/FloatingHearts';
import ProfileEditModal from './components/ProfileEditModal';
import DraggableBrush from './components/DraggableBrush';
import NotificationBell from './components/NotificationBell';
import SettingsModal from './components/SettingsModal';
import MusicPlayer from './components/MusicPlayer';
import { connectSocket, disconnectSocket } from './socket';

// Backend API URL
// Production (Render 1-service): same origin, use '' (relative)
// Dev: http://localhost:5000
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : ''; // same domain in production

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('thoiu_token') || null);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('auth'); // auth, connect, dashboard
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const [highlightPostId, setHighlightPostId]     = useState(null);
  const [openCommentPostId, setOpenCommentPostId] = useState(null);
  const [showSettings, setShowSettings]           = useState(false);
  const [heartsEnabled, setHeartsEnabled] = useState(() => {
    const stored = localStorage.getItem('thoiu_hearts_enabled');
    return stored === null ? true : stored === 'true';
  });

  const handleToggleHearts = (val) => {
    setHeartsEnabled(val);
    localStorage.setItem('thoiu_hearts_enabled', String(val));
  };

  // Load profile details if token exists
  const fetchProfile = async (authToken) => {
    setLoading(true); // show spinner instead of blank screen during transition
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Hết hạn phiên đăng nhập');
      }

      setUser(data);
      if (data.partnerStatus === 'connected') {
        setView('dashboard');
        fetchFeed(authToken);
      } else {
        setView('connect');
      }
    } catch (err) {
      console.error(err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  // Fetch Feed posts
  const fetchFeed = async (authToken) => {
    if (!authToken) return;
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts/feed`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(data);
      }
    } catch (err) {
      console.error('Lỗi nạp feed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Check token on mount
  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
      setView('auth');
    }
  }, [token]);

  // Periodic polling for status/feed updates when in dashboard
  useEffect(() => {
    if (!token || view !== 'dashboard') return;

    const interval = setInterval(async () => {
      // 1. Silent sync profile/partner status
      try {
        const resProfile = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resProfile.ok) {
          const profileData = await resProfile.json();
          setUser(profileData);
          if (profileData.partnerStatus !== 'connected') {
            setView('connect');
          }
        }

        // 2. Silent sync feed posts
        const resFeed = await fetch(`${API_BASE}/api/posts/feed`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resFeed.ok) {
          const feedData = await resFeed.json();
          setPosts(feedData);
        }
      } catch (err) {
        console.error('Error during automatic polling:', err);
      }
    }, 8000); // Poll every 8 seconds

    return () => clearInterval(interval);
  }, [token, view]);

  const handleAuthSuccess = (newToken) => {
    // Only store token — useEffect([token]) will trigger fetchProfile
    // which sets user + view correctly. This avoids the race condition
    // where view='dashboard' but user=null causes a white screen.
    localStorage.setItem('thoiu_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('thoiu_token');
    disconnectSocket();
    socketRef.current = null;
    setSocket(null);
    setToken(null);
    setUser(null);
    setPosts([]);
    setView('auth');
  };

  // ── Soft-delete post from feed ───────────────────────────────────────────
  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(p => String(p._id) !== String(postId)));
  };

  // ── Restore post from trash ──────────────────────────────────────────────
  const handlePostRestored = (post) => {
    // Add the restored post back to feed in chronological order
    setPosts(prev => {
      const exists = prev.some(p => String(p._id) === String(post._id));
      if (exists) return prev;
      return [post, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });
  };

  // ── Navigate to post from notification ────────────────────────────────────────
  const handleNavigate = (postId, type) => {
    // postId may be ObjectId object or string — always coerce to string
    const pid = String(postId?._id ?? postId);
    if (!pid || pid === 'undefined' || pid === 'null') return;

    // Open comments immediately for comment/reply types
    if (['comment', 'reply'].includes(type)) {
      setOpenCommentPostId(pid);
      setTimeout(() => setOpenCommentPostId(null), 800);
    }

    // Highlight
    setHighlightPostId(pid);
    setTimeout(() => setHighlightPostId(null), 2500);

    // Scroll — give React time to re-render + portal to close
    setTimeout(() => {
      const el = document.getElementById(`post-${pid}`);
      if (el) {
        // Reliable cross-browser scroll: offset by fixed header height (~70px)
        const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      } else {
        // last resort: try querySelector
        const el2 = document.querySelector(`[id^="post-${pid}"]`);
        if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };
  useEffect(() => {
    if (!token || !user || user.partnerStatus !== 'connected') return;

    const s = connectSocket(token);
    socketRef.current = s;
    setSocket(s);   // ← triggers re-render so DraggableBrush receives the real socket

    // New post from partner
    s.on('post:new', (newPost) => {
      setPosts(prev => {
        if (prev.some(p => p._id === newPost._id)) return prev; // dedupe
        return [newPost, ...prev];
      });
    });

    // Reaction update
    s.on('post:reaction', ({ postId, reactions }) => {
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, reactions } : p));
    });

    // Comment update
    s.on('post:comment', ({ postId, comments }) => {
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments } : p));
    });

    // Soft-delete: remove from feed in real-time
    s.on('post:deleted', ({ postId }) => {
      setPosts(prev => prev.filter(p => String(p._id) !== String(postId)));
    });

    // Music update from partner or self
    s.on('music:update', ({ userId, music }) => {
      setUser(prev => {
        if (!prev) return prev;
        if (prev.partnerId && String(prev.partnerId._id || prev.partnerId) === String(userId)) {
          return {
            ...prev,
            partnerId: {
              ...prev.partnerId,
              music: music
            }
          };
        }
        if (String(prev._id || prev.id) === String(userId)) {
          return {
            ...prev,
            music: music
          };
        }
        return prev;
      });
    });

    return () => {
      s.off('post:new');
      s.off('post:reaction');
      s.off('post:comment');
      s.off('post:deleted');
      s.off('music:update');
    };
  }, [token, user?.partnerStatus]);

  const handlePartnerConnectChange = (newStatus, partnerData) => {
    setUser(prev => {
      const updated = { ...prev, partnerStatus: newStatus };
      if (partnerData) updated.partnerId = partnerData;
      return updated;
    });

    if (newStatus === 'connected') {
      setView('dashboard');
      fetchFeed(token);
    }
  };

  const handleUploadSuccess = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handleReactionUpdate = (postId, newReactions) => {
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, reactions: newReactions } : p));
  };

  const handleCommentUpdate = (postId, newComments) => {
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: newComments } : p));
  };

  const handleUpdateAnniversary = (newDate) => {
    setUser(prev => ({ ...prev, anniversaryDate: newDate }));
  };

  const handleUpdateStatus = (newStatus) => {
    setUser(prev => ({ ...prev, currentStatus: newStatus }));
  };

  const handleProfileUpdate = ({ avatarUrl, backgroundUrl }) => {
    setUser(prev => ({ ...prev, avatarUrl, backgroundUrl }));
  };

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Heart size={48} fill="#ff6b8b" color="#ff6b8b" className="animate-pulse" style={{ marginBottom: '16px' }} />
          <p style={{ color: '#8c7377', fontWeight: 600 }}>Góc nhỏ riêng tư đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Wind-blown floating hearts background effect */}
      <FloatingHearts enabled={heartsEnabled} />

      {/* User background image — fixed, blurred, semi-transparent */}
      {user?.backgroundUrl && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundImage: `url(${user.backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: -2,
          filter: 'blur(12px) brightness(1.05)',
          transform: 'scale(1.08)', // avoid blur edge artifact
          opacity: 0.22,
        }} />
      )}

      {/* Batman brush — draggable & pinch-zoomable, synced via socket */}
      <DraggableBrush src="/banchaibatman.png" initialWidth={160} socket={socket} />

      {/* Background music player — mobile FAB, hidden on desktop */}
      {view === 'dashboard' && user && (
        <div className="music-player-fab">
          <MusicPlayer partnerMusic={user.partnerId?.music} myMusic={user.music} />
        </div>
      )}

      {/* Dynamic Background Elements */}
      <div style={{
        position: 'fixed',
        top: '10%',
        left: '-5%',
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        background: 'rgba(255, 107, 139, 0.08)',
        filter: 'blur(30px)',
        zIndex: -1
      }} />
      <div style={{
        position: 'fixed',
        bottom: '15%',
        right: '-5%',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'rgba(255, 243, 196, 0.4)',
        filter: 'blur(40px)',
        zIndex: -1
      }} />

      {/* Screen Views */}
      {view === 'auth' && (
        <div style={{ display: 'flex', flex: '1', alignItems: 'center', width: '100%' }}>
          <Auth onAuthSuccess={handleAuthSuccess} apiBase={API_BASE} />
        </div>
      )}

      {view === 'connect' && (
        <div style={{ display: 'flex', flex: '1', alignItems: 'center', width: '100%' }}>
          <ConnectPartner
            user={user}
            onConnectSuccess={handlePartnerConnectChange}
            onLogout={handleLogout}
            apiBase={API_BASE}
            token={token}
          />
        </div>
      )}

      {view === 'dashboard' && user && (
        <>
          {/* ── Main column ─────────────────────────────────────────────── */}
          <div className="app-main-col">

            {/* Header Panel */}
            <div
              className="glass-card app-header"
              style={{ marginBottom: '14px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Avatar */}
                <div
                  onClick={() => setShowProfileEdit(true)}
                  title="Chỉnh sửa hồ sơ"
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: '2px solid #ffd3da',
                    overflow: 'hidden', cursor: 'pointer',
                    background: user.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #ffd3da, #fff3c4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'border-color 0.2s, transform 0.2s',
                    boxShadow: '0 2px 8px rgba(255,107,139,0.15)',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#ff6b8b'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#ffd3da'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Camera size={14} color="#ff6b8b" />
                  }
                </div>
                <Heart size={18} fill="#ff6b8b" color="#ff6b8b" />
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ff6b8b', letterSpacing: '-0.01em' }}>Chloe Memories 💕</span>
              </div>

              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => fetchFeed(token)}
                  className="header-action"
                  title="Tải lại feed"
                >
                  <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} color={refreshing ? '#ff6b8b' : undefined} />
                </button>

                <NotificationBell apiBase={API_BASE} token={token} socket={socket} onNavigate={handleNavigate} />

                <button
                  onClick={() => setShowSettings(true)}
                  className="header-action settings-gear-btn"
                  title="Cài đặt"
                >
                  <Settings size={17} />
                </button>

                <button
                  onClick={handleLogout}
                  className="header-action"
                  title="Đăng xuất"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>

            {/* Couple Widget */}
            <CoupleWidget
              user={user}
              onUpdateAnniversary={handleUpdateAnniversary}
              onUpdateStatus={handleUpdateStatus}
              apiBase={API_BASE}
              token={token}
            />

            {/* Locket Camera */}
            <LocketFrame
              onUploadSuccess={handleUploadSuccess}
              apiBase={API_BASE}
              token={token}
            />

            {/* Feed */}
            <div style={{ width: '100%' }}>
              <div className="section-header" style={{ marginBottom: '14px' }}>
                <Sparkles size={15} />
                <span>Khoảnh khắc yêu thương</span>
              </div>

              {posts.length > 0 ? (
                posts.map((post) => (
                  <MomentCard
                    key={String(post._id)}
                    post={post}
                    currentUser={user}
                    onReact={handleReactionUpdate}
                    onComment={handleCommentUpdate}
                    onDelete={handlePostDelete}
                    apiBase={API_BASE}
                    token={token}
                    highlight={highlightPostId === String(post._id)}
                    autoOpenComments={openCommentPostId === String(post._id)}
                  />
                ))
              ) : (
                <div className="glass-card animate-fade-in" style={{ padding: '40px 20px', textAlign: 'center', color: '#8c7377' }}>
                  <Heart size={36} color="#ffd3da" style={{ marginBottom: '12px' }} />
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Chưa có khoảnh khắc nào được chia sẻ.<br />Hãy chụp bức ảnh đầu tiên gửi đối phương!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar (desktop only) ───────────────────────────────── */}
          <div className="app-sidebar-col">
            {/* Music player — inline in sidebar */}
            <div className="music-player-sidebar">
              <MusicPlayer
                partnerMusic={user.partnerId?.music}
                myMusic={user.music}
                sidebarMode
              />
            </div>

            {/* Partner info card */}
            {user.partnerId && (
              <div className="glass-card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Heart size={14} fill="#ff6b8b" color="#ff6b8b" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ff6b8b' }}>NGƯỜI ẤY</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {user.partnerId.avatarUrl ? (
                    <img src={user.partnerId.avatarUrl} alt={user.partnerId.displayName}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ffd3da', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #ffd3da, #fff3c4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, color: '#ff6b8b', fontSize: '1.2rem' }}>{user.partnerId.displayName?.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.92rem', color: '#3d2e32', marginBottom: '2px' }}>{user.partnerId.displayName}</p>
                    {user.partnerId.currentStatus && (
                      <p style={{ fontSize: '0.75rem', color: '#8c7377', fontStyle: 'italic' }}>"{ user.partnerId.currentStatus}"</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Shortcuts card */}
            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Sparkles size={14} color="#ff6b8b" />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ff6b8b' }}>PHÍM TẮT</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => fetchFeed(token)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: '1px solid #ffd3da', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer', color: '#4a373b', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s', textAlign: 'left' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#fff0f2'; e.currentTarget.style.borderColor = '#ff6b8b'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#ffd3da'; }}
                >
                  <RefreshCw size={14} color="#ff6b8b" /> Tải lại feed
                </button>
                <button
                  onClick={() => setShowProfileEdit(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: '1px solid #ffd3da', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer', color: '#4a373b', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s', textAlign: 'left' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#fff0f2'; e.currentTarget.style.borderColor = '#ff6b8b'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#ffd3da'; }}
                >
                  <Camera size={14} color="#ff6b8b" /> Chỉnh hồ sơ
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: '1px solid #ffd3da', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer', color: '#4a373b', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s', textAlign: 'left' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#fff0f2'; e.currentTarget.style.borderColor = '#ff6b8b'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#ffd3da'; }}
                >
                  <Settings size={14} color="#ff6b8b" /> Cài đặt
                </button>
                <button
                  onClick={handleLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: '1px solid #ffd3da', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer', color: '#8c7377', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s', textAlign: 'left' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#fff0f2'; e.currentTarget.style.borderColor = '#ffb0bb'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#ffd3da'; }}
                >
                  <LogOut size={14} color="#8c7377" /> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Profile Edit Modal */}
      {showProfileEdit && user && (
        <ProfileEditModal
          user={user}
          apiBase={API_BASE}
          token={token}
          onUpdate={handleProfileUpdate}
          onClose={() => setShowProfileEdit(false)}
        />
      )}

      {/* Settings Modal (Trash, etc.) */}
      {showSettings && (
        <SettingsModal
          apiBase={API_BASE}
          token={token}
          onClose={() => setShowSettings(false)}
          onRestored={handlePostRestored}
          user={user}
          onUserUpdate={setUser}
          heartsEnabled={heartsEnabled}
          onToggleHearts={handleToggleHearts}
        />
      )}
    </div>
  );
}
