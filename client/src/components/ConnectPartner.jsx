import React, { useState } from 'react';
import { HeartHandshake, LogOut, Search, Clock } from 'lucide-react';

export default function ConnectPartner({ user, onConnectSuccess, onLogout, apiBase, token }) {
  const [partnerUsername, setPartnerUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleConnect = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/partner/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ partnerUsername }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đã xảy ra lỗi khi gửi lời mời');
      }

      setSuccessMsg(data.message);
      // Callback to update the user details in parent App.jsx
      onConnectSuccess(data.partnerStatus, data.partner);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card animate-scale-in" style={{ padding: '32px 24px', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex',
          padding: '12px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ffd3da 0%, #fff3c4 100%)',
          color: '#ff6b8b',
          marginBottom: '16px'
        }}>
          <HeartHandshake size={36} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff6b8b', marginBottom: '8px' }}>
          Kết nối yêu thương 💕
        </h2>
        <p style={{ color: '#8c7377', fontSize: '0.95rem', lineHeight: 1.4 }}>
          {user.partnerStatus === 'pending'
            ? 'Đang đợi người thương kết nối lại...'
            : 'Hãy nhập tên tài khoản của người ấy để bắt đầu đồng bộ khoảnh khắc.'}
        </p>
      </div>

      {error && (
        <div className="sweet-alert sweet-alert-error" style={{ marginBottom: '16px' }}>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="sweet-alert sweet-alert-success" style={{ marginBottom: '16px' }}>
          <span>{successMsg}</span>
        </div>
      )}

      {user.partnerStatus === 'pending' ? (
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#e6a100',
            fontWeight: 500,
            background: '#fffdf0',
            padding: '12px 18px',
            borderRadius: '16px',
            border: '1px solid #ffe3a8'
          }}>
            <Clock size={18} className="animate-pulse" />
            <span>Đang chờ đối phương điền tên bạn...</span>
          </div>
          <p style={{ color: '#8c7377', fontSize: '0.85rem', marginTop: '14px', lineHeight: 1.4 }}>
            Lời khuyên: Hãy nhắc đối phương đăng nhập và gửi lời mời kết nối tới tài khoản của bạn <b>({user.username})</b>!
          </p>
        </div>
      ) : (
        <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '16px', color: '#ff6b8b' }}>
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Tên tài khoản người thương"
              value={partnerUsername}
              onChange={(e) => setPartnerUsername(e.target.value)}
              style={{ paddingLeft: '44px' }}
              required
              autoCapitalize="none"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi lời mời kết nối 💕'}
          </button>
        </form>
      )}

      <div style={{ borderTop: '1px solid rgba(255, 107, 139, 0.15)', marginTop: '24px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: '#8c7377' }}>
          Tài khoản của bạn: <b>{user.username}</b>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            color: '#8c7377',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          <LogOut size={14} /> Đăng xuất
        </button>
      </div>
    </div>
  );
}
