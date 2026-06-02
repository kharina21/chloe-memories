import React, { useState, useRef } from 'react';
import { X, Camera, Image, User, Check, Loader, Mail, ShieldCheck } from 'lucide-react';

export default function ProfileEditModal({ user, apiBase, token, onUpdate, onClose }) {
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || null);
  const [bgPreview, setBgPreview]         = useState(user.backgroundUrl || null);
  const [avatarFile, setAvatarFile]       = useState(null);
  const [bgFile, setBgFile]               = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);
  // Email
  const [emailInput, setEmailInput]       = useState(user.email || '');
  const [emailVerified, setEmailVerified] = useState(user.emailVerified || false);
  const [otpInput, setOtpInput]           = useState('');
  const [otpSent, setOtpSent]             = useState(false);
  const [emailLoading, setEmailLoading]   = useState(false);
  const [emailMsg, setEmailMsg]           = useState('');

  const avatarInputRef = useRef();
  const bgInputRef     = useRef();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleBgChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBgFile(file);
    setBgPreview(URL.createObjectURL(file));
  };

  const handleSendOtp = async () => {
    if (!emailInput.includes('@')) { setEmailMsg('Email không hợp lệ'); return; }
    setEmailLoading(true); setEmailMsg('');
    try {
      const res = await fetch(`${apiBase}/api/user/email/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOtpSent(true);
      setEmailMsg('📨 Mã OTP đã được gửi! Kiểm tra hộp thư của bạn.');
    } catch (err) { setEmailMsg(err.message); }
    finally { setEmailLoading(false); }
  };

  const handleConfirmOtp = async () => {
    if (!otpInput || otpInput.length < 6) { setEmailMsg('Vui lòng nhập mã 6 chữ số'); return; }
    setEmailLoading(true); setEmailMsg('');
    try {
      const res = await fetch(`${apiBase}/api/user/email/confirm-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp: otpInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setEmailVerified(true);
      setOtpSent(false);
      setOtpInput('');
      setEmailMsg('✅ ' + data.message);
    } catch (err) { setEmailMsg(err.message); }
    finally { setEmailLoading(false); }
  };

  const handleSave = async () => {
    if (!avatarFile && !bgFile) {
      onClose();
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Upload avatar nếu có chọn file mới
      let newAvatarUrl = user.avatarUrl;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const res = await fetch(`${apiBase}/api/user/avatar`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi tải ảnh đại diện');
        newAvatarUrl = data.avatarUrl;
      }

      // Upload background nếu có chọn file mới
      let newBgUrl = user.backgroundUrl;
      if (bgFile) {
        const formData = new FormData();
        formData.append('background', bgFile);
        const res = await fetch(`${apiBase}/api/user/background`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi tải ảnh nền');
        newBgUrl = data.backgroundUrl;
      }

      setSuccess(true);
      onUpdate({ avatarUrl: newAvatarUrl, backgroundUrl: newBgUrl });

      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Modal Card */}
      <div
        className="glass-card animate-scale-in"
        style={{ width: '100%', maxWidth: '420px', padding: '28px 24px', position: 'relative' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#8c7377', padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ff6b8b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} /> Chỉnh sửa hồ sơ
        </h2>

        {/* ── Avatar Upload ── */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '0.82rem', color: '#8c7377', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Camera size={14} /> Ảnh đại diện
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Preview circle */}
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{
                width: '80px', height: '80px', borderRadius: '50%',
                border: '3px dashed #ffd3da',
                overflow: 'hidden', cursor: 'pointer',
                background: avatarPreview ? 'transparent' : 'rgba(255,211,218,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'border-color 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = '#ff6b8b'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = '#ffd3da'}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Camera size={24} color="#ffd3da" />
              }
            </div>
            <div>
              <button
                className="btn-secondary"
                onClick={() => avatarInputRef.current?.click()}
                style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '10px' }}
              >
                {avatarPreview ? 'Đổi ảnh khác' : 'Chọn ảnh'}
              </button>
              <p style={{ fontSize: '0.75rem', color: '#8c7377', marginTop: '6px' }}>
                JPG, PNG · tối đa 10MB
              </p>
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,107,139,0.12)', margin: '0 0 20px' }} />

        {/* ── Background Upload ── */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '0.82rem', color: '#8c7377', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Image size={14} /> Ảnh nền (mờ nhẹ trên nền app)
          </p>

          <div
            onClick={() => bgInputRef.current?.click()}
            style={{
              width: '100%', height: '110px', borderRadius: '16px',
              border: '3px dashed #ffd3da',
              overflow: 'hidden', cursor: 'pointer',
              background: bgPreview
                ? `url(${bgPreview}) center/cover`
                : 'rgba(255,211,218,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              transition: 'border-color 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#ff6b8b'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#ffd3da'}
          >
            {bgPreview && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,240,242,0.5)',
                backdropFilter: 'blur(2px)',
              }} />
            )}
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <Image size={22} color={bgPreview ? '#ff6b8b' : '#ffd3da'} />
              <p style={{ fontSize: '0.8rem', color: bgPreview ? '#ff6b8b' : '#8c7377', marginTop: '4px', fontWeight: 600 }}>
                {bgPreview ? 'Nhấn để đổi ảnh nền' : 'Chọn ảnh nền'}
              </p>
            </div>
          </div>
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBgChange}
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,107,139,0.12)', margin: '0 0 20px' }} />

        {/* ── Email Verification ── */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '0.82rem', color: '#8c7377', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} /> Email nhận thông báo
            {emailVerified && <span style={{ background: '#f1fcf4', color: '#27ae60', border: '1px solid #d4f5e0', borderRadius: '10px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}><ShieldCheck size={10} style={{ display: 'inline', marginRight: '3px' }} />Xác thực</span>}
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="email"
              placeholder="email@gmail.com"
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setEmailVerified(false); setOtpSent(false); setEmailMsg(''); }}
              style={{ padding: '10px 14px', fontSize: '0.9rem', borderRadius: '12px', flex: 1 }}
            />
            <button
              className="btn-secondary"
              onClick={handleSendOtp}
              disabled={emailLoading || !emailInput}
              style={{ padding: '10px 12px', borderRadius: '12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            >
              {emailLoading && !otpSent ? <Loader size={14} className="animate-spin" /> : (otpSent ? 'Gửi lại' : 'Gửi mã')}
            </button>
          </div>
          {otpSent && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Nhập mã 6 số"
                value={otpInput}
                onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{ padding: '10px 14px', fontSize: '1.1rem', borderRadius: '12px', letterSpacing: '6px', textAlign: 'center', flex: 1 }}
              />
              <button
                className="btn-primary"
                onClick={handleConfirmOtp}
                disabled={emailLoading || otpInput.length < 6}
                style={{ padding: '10px 12px', borderRadius: '12px', fontSize: '0.82rem' }}
              >
                {emailLoading ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
            </div>
          )}
          {emailMsg && (
            <p style={{ marginTop: '8px', fontSize: '0.8rem', color: emailMsg.startsWith('✅') || emailMsg.startsWith('📨') ? '#27ae60' : '#d63031' }}>
              {emailMsg}
            </p>
          )}
        </div>

        {/* Error / Success */}
        {error && (
          <div className="sweet-alert sweet-alert-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="sweet-alert sweet-alert-success" style={{ marginBottom: '16px' }}>
            <Check size={16} /> Đã cập nhật hồ sơ!
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: '14px' }}
            disabled={uploading}
          >
            Hủy
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            style={{ flex: 1, padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            disabled={uploading}
          >
            {uploading
              ? <><Loader size={16} className="animate-spin" /> Đang lưu...</>
              : <><Check size={16} /> Lưu hồ sơ</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
