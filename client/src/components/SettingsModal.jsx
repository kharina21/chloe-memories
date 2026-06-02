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

export default function SettingsModal({ apiBase, token, onClose, onRestored }) {
  const [tab, setTab]           = useState('trash');
  const [trashPosts, setTrash]  = useState([]);
  const [loading, setLoading]   = useState(false);
  const [restoring, setRestoring] = useState(null);

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
    // Future tabs can be added here
  ];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        className="glass-card animate-scale-in"
        style={{
          width: '100%', maxWidth: '480px',
          maxHeight: '85vh',
          borderRadius: '28px 28px 0 0',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(255,255,255,0.97)',
          boxShadow: '0 -8px 48px rgba(255,107,139,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚙️</span>
            <span style={{ fontWeight: 800, color: '#ff6b8b', fontSize: '1.05rem' }}>Cài đặt</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377' }}><X size={22} /></button>
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
        </div>
      </div>
      {/* Backdrop click to close */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: -1 }}
        onClick={onClose}
      />
    </div>
  , document.body);
}
