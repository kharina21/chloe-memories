import React, { useState } from 'react';
import { Heart, Lock, User, Sparkles } from 'lucide-react';

export default function Auth({ onAuthSuccess, apiBase }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { username, password }
      : { username, password, displayName };

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đã xảy ra lỗi, vui lòng thử lại');
      }

      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card animate-scale-in" style={{ padding: '32px 24px', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex',
          padding: '12px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ffd3da 0%, #fff3c4 100%)',
          color: '#ff6b8b',
          marginBottom: '16px',
          animation: 'pulseBorder 2.5s infinite'
        }}>
          <Heart size={32} fill="#ff6b8b" />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ff6b8b', marginBottom: '6px' }}>
          Chloe Memories 💕
        </h1>
        <p style={{ color: '#8c7377', fontSize: '0.95rem' }}>
          {isLogin ? 'Chào mừng bạn quay lại góc nhỏ riêng tư' : 'Tạo không gian ngọt ngào cho riêng hai bạn'}
        </p>
      </div>

      {error && (
        <div className="sweet-alert sweet-alert-error">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!isLogin && (
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '16px', color: '#ff6b8b' }}>
              <Sparkles size={18} />
            </span>
            <input
              type="text"
              placeholder="Biệt danh (ví dụ: Bé Thơ)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ paddingLeft: '44px' }}
              required
            />
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '16px', top: '16px', color: '#ff6b8b' }}>
            <User size={18} />
          </span>
          <input
            type="text"
            placeholder="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ paddingLeft: '44px' }}
            required
            autoCapitalize="none"
          />
        </div>

        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '16px', top: '16px', color: '#ff6b8b' }}>
            <Lock size={18} />
          </span>
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingLeft: '44px' }}
            required
          />
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={loading}>
          {loading ? 'Đang xử lý...' : isLogin ? 'Vào góc tình yêu 🌸' : 'Bắt đầu hành trình ✨'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#ff6b8b',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </div>
    </div>
  );
}
