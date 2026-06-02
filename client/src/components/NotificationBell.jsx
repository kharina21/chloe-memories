import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCheck } from 'lucide-react';

const TYPE_ICON = {
  post:     '📸',
  comment:  '💬',
  reply:    '↩️',
  reaction: '❤️',
  brush:    '🪥',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export default function NotificationBell({ apiBase, token, socket, onNavigate }) {
  const [notifs, setNotifs]   = useState([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef(null);   // bell button wrapper
  const menuRef = useRef(null);   // portal dropdown — lives outside dropRef in DOM

  const unread = notifs.filter(n => !n.read).length;

  // ── Fetch notifications ──────────────────────────────────────
  const fetchNotifs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifs(await res.json());
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 15000); // poll every 15s
    return () => clearInterval(id);
  }, [token]);

  // Real-time socket event
  useEffect(() => {
    if (!socket) return;
    const onNew = (notif) => {
      setNotifs(prev => [notif, ...prev]);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket]);

  // Click outside → close
  // IMPORTANT: menuRef must also be checked because the portal lives at document.body,
  // NOT inside dropRef — without this, every click inside the dropdown triggers close
  useEffect(() => {
    const handler = (e) => {
      const inBell = dropRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inBell && !inMenu) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Mark read ────────────────────────────────────────────────
  const markRead = async (id) => {
    setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    await fetch(`${apiBase}/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    await fetch(`${apiBase}/api/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
        style={{
          position: 'relative',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#8c7377', padding: '4px',
          display: 'flex', alignItems: 'center',
        }}
        title="Thông báo"
      >
        <Bell size={20} color={unread > 0 ? '#ff6b8b' : '#8c7377'} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px', right: '-2px',
            background: '#ff6b8b',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 800,
            minWidth: '16px', height: '16px',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown — rendered via Portal directly on body to bypass parent stacking context */}
      {open && createPortal(
        <div
          ref={menuRef}
          className="glass-card animate-scale-in"
          style={{
            position: 'fixed',
            top: '64px',
            right: '16px',
            left: '16px',
            maxWidth: '400px',
            margin: '0 auto',
            zIndex: 99999,
            padding: 0,
            overflow: 'hidden',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,107,139,0.12)',
            flexShrink: 0,
          }}>
            <span style={{ fontWeight: 800, color: '#ff6b8b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={16} /> Thông báo {unread > 0 && <span style={{ background: '#ff6b8b', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.75rem' }}>{unread}</span>}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', color: '#8c7377', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <CheckCheck size={14} /> Đọc tất cả
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377' }}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && notifs.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8c7377', fontSize: '0.85rem' }}>Đang tải...</div>
            )}
            {!loading && notifs.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <Bell size={32} color="#ffd3da" style={{ marginBottom: '8px' }} />
                <p style={{ color: '#8c7377', fontSize: '0.85rem' }}>Chưa có thông báo nào</p>
              </div>
            )}
            {notifs.map(n => (
              <div
                key={n._id}
                onClick={() => {
                  markRead(n._id);
                  if (n.postId) {
                    setOpen(false);
                    onNavigate?.(n.postId, n.type);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 16px',
                  background: n.read ? 'transparent' : 'rgba(255,107,139,0.06)',
                  borderBottom: '1px solid rgba(255,107,139,0.07)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,107,139,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(255,107,139,0.06)'}
              >
                {/* Avatar or icon */}
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  border: '2px solid #ffd3da',
                  overflow: 'hidden', flexShrink: 0,
                  background: 'linear-gradient(135deg, #ffd3da, #fff3c4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  {n.fromUser?.avatarUrl
                    ? <img src={n.fromUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : TYPE_ICON[n.type] || '💕'
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#4a373b', lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#8c7377' }}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff6b8b', flexShrink: 0, marginTop: '4px' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      , document.body)}
    </div>
  );
}
