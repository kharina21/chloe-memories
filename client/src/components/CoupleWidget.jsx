import React, { useState } from 'react';
import { Calendar, Smile, Heart, Check, Sparkles } from 'lucide-react';

export default function CoupleWidget({ user, onUpdateAnniversary, onUpdateStatus, apiBase, token }) {
  const [showAnniversaryInput, setShowAnniversaryInput] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState(user.anniversaryDate ? user.anniversaryDate.substring(0, 10) : '');
  const [customStatus, setCustomStatus] = useState(user.currentStatus || '');
  const [showPresets, setShowPresets] = useState(false);
  const [anniversaryLoading, setAnniversaryLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const statusPresets = [
    'Đang nghĩ về bạn... 💕',
    'Nhớ bạn quá đi ❤️',
    'Đang học bài 📚',
    'Đang làm việc nè 💼',
    'Đang ăn cơm 🍲',
    'Đang chuẩn bị ngủ 😴',
    'Đang dạo phố 🚶',
    'Đang nhớ vợ/chồng 😘'
  ];

  // Calculate days together
  const getDaysTogether = () => {
    if (!user.anniversaryDate) return null;
    const start = new Date(user.anniversaryDate);
    const today = new Date();
    // Reset hours to avoid partial day issues
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = Math.abs(today - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Count day 1 as the first day
    return diffDays;
  };

  const daysTogether = getDaysTogether();

  const handleSaveAnniversary = async (e) => {
    e.preventDefault();
    if (!anniversaryDate) return;
    setAnniversaryLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/user/anniversary`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ anniversaryDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onUpdateAnniversary(data.anniversaryDate);
      setShowAnniversaryInput(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setAnniversaryLoading(false);
    }
  };

  const handleUpdateStatus = async (statusText) => {
    setStatusLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/user/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: statusText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onUpdateStatus(data.currentStatus);
      setCustomStatus(data.currentStatus);
      setShowPresets(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="glass-card animate-scale-in" style={{ padding: '20px', width: '100%', marginBottom: '20px' }}>
      {/* Couple Days Counter */}
      <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '10px'
        }}>
          {/* User A */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#ffffd0',
              border: '2px solid #ff6b8b',
              color: '#ff6b8b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
              margin: '0 auto 6px'
            }}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ff6b8b' }}>{user.displayName}</span>
          </div>

          {/* Connected Hearts */}
          <div style={{ position: 'relative' }}>
            <Heart size={28} fill="#ff6b8b" color="#ff6b8b" className="animate-pulse" />
          </div>

          {/* User B (Partner) */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#fff0f2',
              border: '2px solid #e6a100',
              color: '#e6a100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
              margin: '0 auto 6px'
            }}>
              {user.partnerId ? user.partnerId.displayName.charAt(0).toUpperCase() : '?'}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e6a100' }}>
              {user.partnerId ? user.partnerId.displayName : 'Người yêu'}
            </span>
          </div>
        </div>

        {daysTogether !== null ? (
          <div>
            <div style={{ fontSize: '0.9rem', color: '#8c7377', fontWeight: 500 }}>Chúng mình đã bên nhau</div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ff6b8b', lineHeight: 1.2, margin: '4px 0' }}>
              {daysTogether} <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>ngày</span>
            </div>
            <button 
              onClick={() => setShowAnniversaryInput(!showAnniversaryInput)}
              style={{ background: 'none', border: 'none', color: '#8c7377', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Thay đổi ngày kỷ niệm
            </button>
          </div>
        ) : (
          <div style={{ padding: '10px 0' }}>
            <p style={{ fontSize: '0.85rem', color: '#8c7377', marginBottom: '8px' }}>Chưa thiết lập ngày kỷ niệm yêu nhau</p>
            <button 
              className="btn-secondary" 
              onClick={() => setShowAnniversaryInput(true)}
              style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '12px' }}
            >
              <Calendar size={14} /> Chọn ngày kỷ niệm
            </button>
          </div>
        )}

        {/* Set Anniversary Modal/Input Box */}
        {showAnniversaryInput && (
          <form onSubmit={handleSaveAnniversary} style={{
            marginTop: '12px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid #ffd3da',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <input 
              type="date" 
              value={anniversaryDate} 
              onChange={(e) => setAnniversaryDate(e.target.value)} 
              required
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowAnniversaryInput(false)}
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={anniversaryLoading}
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                {anniversaryLoading ? 'Lưu...' : 'Lưu ngày'}
              </button>
            </div>
          </form>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 107, 139, 0.12)', margin: '16px 0' }} />

      {/* Partner Status Display */}
      {user.partnerId && (
        <div style={{
          backgroundColor: '#fffdf0',
          borderRadius: '16px',
          padding: '12px 14px',
          border: '1px solid #ffe3a8',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#e6a100', fontWeight: 600, marginBottom: '4px' }}>
            <Sparkles size={12} />
            <span>Trạng thái của {user.partnerId.displayName}:</span>
          </div>
          <p style={{ fontSize: '0.95rem', fontWeight: 500, color: '#4a3e40' }}>
            {user.partnerId.currentStatus || 'Không có trạng thái mới'}
          </p>
        </div>
      )}

      {/* Your Status Input Area */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#ff6b8b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Smile size={14} /> Trạng thái của bạn:
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Bạn đang làm gì thế?"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            style={{ padding: '10px 14px', fontSize: '0.9rem', borderRadius: '12px' }}
            onFocus={() => setShowPresets(true)}
          />
          {customStatus !== user.currentStatus && (
            <button 
              onClick={() => handleUpdateStatus(customStatus)}
              className="btn-primary" 
              style={{ padding: '10px 14px', borderRadius: '12px' }}
              disabled={statusLoading}
            >
              <Check size={16} />
            </button>
          )}
        </div>

        {/* Status Presets */}
        {showPresets && (
          <div style={{
            marginTop: '10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            maxHeight: '120px',
            overflowY: 'auto',
            background: 'rgba(255, 255, 255, 0.5)',
            padding: '8px',
            borderRadius: '12px',
            border: '1px solid #ffd3da'
          }}>
            {statusPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => handleUpdateStatus(preset)}
                style={{
                  background: 'white',
                  border: '1px solid #ffd3da',
                  padding: '6px 10px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  color: '#4a373b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => e.target.style.borderColor = '#ff6b8b'}
                onMouseOut={(e) => e.target.style.borderColor = '#ffd3da'}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
