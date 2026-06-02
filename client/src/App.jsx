import React, { useState, useEffect } from 'react';
import { LogOut, RefreshCw, Heart, Sparkles } from 'lucide-react';
import Auth from './components/Auth';
import ConnectPartner from './components/ConnectPartner';
import CoupleWidget from './components/CoupleWidget';
import LocketFrame from './components/LocketFrame';
import MomentCard from './components/MomentCard';
import FloatingHearts from './components/FloatingHearts';

// Backend API URL
const API_BASE = 'http://localhost:5000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('thoiu_token') || null);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('auth'); // auth, connect, dashboard

  // Load profile details if token exists
  const fetchProfile = async (authToken) => {
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

  const handleAuthSuccess = (newToken, userData) => {
    localStorage.setItem('thoiu_token', newToken);
    setToken(newToken);
    setUser(userData);
    if (userData.partnerStatus === 'connected') {
      setView('dashboard');
      fetchFeed(newToken);
    } else {
      setView('connect');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('thoiu_token');
    setToken(null);
    setUser(null);
    setPosts([]);
    setView('auth');
  };

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
      <FloatingHearts />
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
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px' }}>
          
          {/* Header Panel */}
          <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Heart size={20} fill="#ff6b8b" color="#ff6b8b" />
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ff6b8b' }}>Chloe Memories 💕</span>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => fetchFeed(token)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: refreshing ? '#ff6b8b' : '#8c7377',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title="Tải lại feed"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8c7377',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Interactive Anniversary Widget & Status Updates */}
          <CoupleWidget
            user={user}
            onUpdateAnniversary={handleUpdateAnniversary}
            onUpdateStatus={handleUpdateStatus}
            apiBase={API_BASE}
            token={token}
          />

          {/* Capture Locket camera component */}
          <LocketFrame
            onUploadSuccess={handleUploadSuccess}
            apiBase={API_BASE}
            token={token}
          />

          {/* feed of Locket moments */}
          <div style={{ width: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '1rem',
              fontWeight: 800,
              color: '#ff6b8b',
              marginBottom: '14px',
              paddingLeft: '4px'
            }}>
              <Sparkles size={16} />
              <span>Khoảnh khắc yêu thương</span>
            </div>

            {posts.length > 0 ? (
              posts.map((post) => (
                <MomentCard
                  key={post._id}
                  post={post}
                  currentUser={user}
                  onReact={handleReactionUpdate}
                  onComment={handleCommentUpdate}
                  apiBase={API_BASE}
                  token={token}
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
      )}
    </div>
  );
}
