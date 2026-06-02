import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, CornerDownRight, Image, X, Smile, MoreHorizontal, Pencil, Trash2, Share2, Check } from 'lucide-react';

const COMMENT_EMOJIS = ['❤️', '😍', '😂', '🥺', '👏', '🔥'];
const POST_EMOJIS    = ['❤️', '😍', '😘', '🥺', '😂', '🎉'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function Avatar({ user, size = 34, isMine }) {
  const bg = isMine ? '#ff6b8b' : '#e6a100';
  return user?.avatarUrl
    ? <img src={user.avatarUrl} alt={user.displayName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${bg}`, flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.4, border: `2px solid ${bg}`, flexShrink: 0 }}>
        {user?.displayName?.charAt(0).toUpperCase()}
      </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MomentCard({
  post, currentUser, onReact, onComment, onDelete,
  apiBase, token, autoOpenComments, highlight,
}) {
  const [showComments, setShowComments]     = useState(false);
  const [emojiTarget, setEmojiTarget]       = useState(null); // 'post' | commentId | null
  const [postMenuOpen, setPostMenuOpen]     = useState(false);
  const [sharing, setSharing]               = useState(false);

  // Top-level comment
  const [commentText, setCommentText]       = useState('');
  const [commentFile, setCommentFile]       = useState(null);
  const [commentPreview, setCommentPreview] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Per-comment state: reply, edit, delete
  const [commentStates, setCommentStates]   = useState({});

  const cardRef       = useRef(null);
  const commentFileRef = useRef(null);

  useEffect(() => { if (autoOpenComments) setShowComments(true); }, [autoOpenComments]);

  // ── Helpers ──────────────────────────────────────────────
  const getCS = (id) => commentStates[id] || {};
  const setCS = (id, patch) => setCommentStates(p => ({ ...p, [id]: { ...getCS(id), ...patch } }));
  const getRS = (cid, rid) => getCS(cid)[`reply_${rid}`] || {};
  const setRS = (cid, rid, patch) => setCS(cid, { [`reply_${rid}`]: { ...getRS(cid, rid), ...patch } });

  // ── Floating hearts ───────────────────────────────────────
  const createHearts = (emoji, x, y) => {
    if (!cardRef.current) return;
    for (let i = 0; i < 5; i++) {
      const el = document.createElement('div');
      el.className = 'heart-float';
      el.innerText = emoji;
      el.style.left = `${x + (Math.random() - 0.5) * 60}px`;
      el.style.top  = `${y}px`;
      el.style.animationDelay = `${Math.random() * 0.2}s`;
      cardRef.current.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }
  };

  // ── Post react ────────────────────────────────────────────
  const handlePostReact = async (e, emoji) => {
    const rect = cardRef.current.getBoundingClientRect();
    createHearts(emoji, e.clientX - rect.left, e.clientY - rect.top);
    setEmojiTarget(null);
    try {
      const res = await fetch(`${apiBase}/api/posts/${post._id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (res.ok) onReact(post._id, data);
    } catch {}
  };

  // ── Delete post ───────────────────────────────────────────
  const handleDeletePost = async () => {
    if (!confirm('Chuyển bài viết này vào thùng rác?')) return;
    setPostMenuOpen(false);
    try {
      const res = await fetch(`${apiBase}/api/posts/${String(post._id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) onDelete?.(String(post._id));
    } catch {}
  };

  // ── Share post ────────────────────────────────────────────
  const handleShare = async () => {
    setPostMenuOpen(false);
    setSharing(true);
    const url = post.imageUrl;
    if (navigator.share) {
      try { await navigator.share({ title: 'Chloe Memories', text: post.caption || '', url }); }
      catch {}
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setTimeout(() => setSharing(false), 2000);
      return;
    }
    setSharing(false);
  };

  // ── Send top-level comment ────────────────────────────────
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && !commentFile) return;
    setCommentLoading(true);
    try {
      const fd = new FormData();
      if (commentText.trim()) fd.append('text', commentText.trim());
      if (commentFile) fd.append('image', commentFile);
      const res = await fetch(`${apiBase}/api/posts/${post._id}/comment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) { onComment(post._id, data); setCommentText(''); setCommentFile(null); setCommentPreview(''); }
    } catch {}
    finally { setCommentLoading(false); }
  };

  // ── Edit comment ──────────────────────────────────────────
  const handleEditComment = async (commentId) => {
    const cs = getCS(commentId);
    if (!cs.editText?.trim()) return;
    setCS(commentId, { editLoading: true });
    try {
      const res = await fetch(`${apiBase}/api/posts/${post._id}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: cs.editText }),
      });
      const data = await res.json();
      if (res.ok) { onComment(post._id, data); setCS(commentId, { editing: false, editLoading: false }); }
    } catch {}
    finally { setCS(commentId, { editLoading: false }); }
  };

  // ── Delete comment ────────────────────────────────────────
  const handleDeleteComment = async (commentId) => {
    try {
      const res = await fetch(`${apiBase}/api/posts/${post._id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) onComment(post._id, data);
    } catch {}
  };

  // ── Comment emoji react ────────────────────────────────────
  const handleCommentReact = async (commentId, emoji) => {
    setEmojiTarget(null);
    try {
      const res = await fetch(`${apiBase}/api/posts/${post._id}/comments/${commentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (res.ok) onComment(post._id, data);
    } catch {}
  };

  // ── Reply to comment ──────────────────────────────────────
  const handleSendReply = async (e, commentId) => {
    e.preventDefault();
    const cs = getCS(commentId);
    if (!cs.replyText?.trim() && !cs.replyFile) return;
    setCS(commentId, { replyLoading: true });
    try {
      const fd = new FormData();
      if (cs.replyText?.trim()) fd.append('text', cs.replyText.trim());
      if (cs.replyFile) fd.append('image', cs.replyFile);
      const res = await fetch(`${apiBase}/api/posts/${post._id}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) { onComment(post._id, data); setCS(commentId, { replyText: '', replyFile: null, replyPreview: '', replyOpen: false, replyLoading: false }); }
    } catch {}
    finally { setCS(commentId, { replyLoading: false }); }
  };

  // ── Reply to a reply ──────────────────────────────────────
  const handleSendReplyToReply = async (e, commentId, replyId) => {
    e.preventDefault();
    const rs = getRS(commentId, replyId);
    if (!rs.text?.trim() && !rs.file) return;
    setRS(commentId, replyId, { loading: true });
    try {
      const fd = new FormData();
      if (rs.text?.trim()) fd.append('text', rs.text.trim());
      if (rs.file) fd.append('image', rs.file);
      const res = await fetch(`${apiBase}/api/posts/${post._id}/comments/${commentId}/replies/${replyId}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) { onComment(post._id, data); setRS(commentId, replyId, { text: '', file: null, preview: '', open: false, loading: false }); }
    } catch {}
    finally { setRS(commentId, replyId, { loading: false }); }
  };

  // ── Edit reply ────────────────────────────────────────────
  const handleEditReply = async (commentId, replyId, editText) => {
    try {
      const res = await fetch(`${apiBase}/api/posts/${post._id}/comments/${commentId}/replies/${replyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: editText }),
      });
      const data = await res.json();
      if (res.ok) { onComment(post._id, data); setRS(commentId, replyId, { editing: false }); }
    } catch {}
  };

  // ── Delete reply ──────────────────────────────────────────
  const handleDeleteReply = async (commentId, replyId) => {
    try {
      const res = await fetch(`${apiBase}/api/posts/${post._id}/comments/${commentId}/replies/${replyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) onComment(post._id, data);
    } catch {}
  };

  const reactionCounts  = (() => { const m = {}; post.reactions.forEach(r => { m[r.emoji] = (m[r.emoji] || 0) + 1; }); return Object.entries(m); })();
  const myPostReaction  = post.reactions.find(r => String(r.userId) === String(currentUser.id))?.emoji;
  const isMySender      = String(post.sender._id) === String(currentUser.id);

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      id={`post-${String(post._id)}`}
      ref={cardRef}
      className="glass-card animate-fade-in"
      style={{
        padding: '16px', width: '100%', marginBottom: '20px',
        position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px',
        transition: 'box-shadow 0.4s ease',
        ...(highlight ? { boxShadow: '0 0 0 3px #ff6b8b, 0 8px 32px rgba(255,107,139,0.35)' } : {}),
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar user={post.sender} isMine={isMySender} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4a3e40' }}>{post.sender.displayName}</div>
            <div style={{ fontSize: '0.72rem', color: '#8c7377' }}>{timeAgo(post.createdAt)}</div>
          </div>
        </div>
        {/* 3-dot menu — only for sender */}
        {isMySender && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setPostMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7377', padding: '4px', display: 'flex', alignItems: 'center' }}
            ><MoreHorizontal size={18} /></button>
            {postMenuOpen && (
              <div style={{
                position: 'absolute', top: '28px', right: 0,
                background: 'white', borderRadius: '14px',
                border: '1px solid #ffd3da',
                boxShadow: '0 8px 24px rgba(255,107,139,0.18)',
                zIndex: 1000, minWidth: '140px', overflow: 'hidden',
              }}>
                <button
                  onClick={handleShare}
                  style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', color: '#4a373b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {sharing ? <Check size={14} color="#27ae60" /> : <Share2 size={14} />}
                  {sharing ? 'Đã sao chép!' : 'Chia sẻ ảnh'}
                </button>
                <button
                  onClick={handleDeletePost}
                  style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #fff0f2' }}>
                  <Trash2 size={14} /> Xóa bài
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Post image ── */}
      <div style={{ borderRadius: '20px', overflow: 'hidden', border: '3px solid white', boxShadow: '0 8px 16px rgba(255,107,139,0.08)', position: 'relative', aspectRatio: '1', backgroundColor: '#f8f9fa' }}
        onClick={() => { if (postMenuOpen) setPostMenuOpen(false); if (emojiTarget) setEmojiTarget(null); }}>
        <img src={post.imageUrl} alt="Locket moment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {post.caption && (
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 12px', borderRadius: '16px', fontSize: '0.85rem', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
            {post.caption}
          </div>
        )}
      </div>

      {/* ── Action bar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: '24px', border: '1px solid #ffd3da' }}>
          {POST_EMOJIS.map(emoji => {
            const active = myPostReaction === emoji;
            return (
              <button key={emoji} onClick={(e) => handlePostReact(e, emoji)}
                style={{ background: active ? '#ffd3da' : 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '2px 6px', borderRadius: '12px', transition: 'transform 0.15s', transform: active ? 'scale(1.2)' : 'none' }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.3)'}
                onMouseOut={e => e.currentTarget.style.transform = active ? 'scale(1.2)' : 'scale(1)'}
              >{emoji}</button>
            );
          })}
        </div>
        <button onClick={() => setShowComments(!showComments)}
          style={{ background: 'none', border: 'none', color: showComments ? '#ff6b8b' : '#8c7377', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
          <MessageCircle size={18} />
          <span>Bình luận ({post.comments.filter(c => !c.deleted).length})</span>
        </button>
      </div>

      {/* Reaction counts */}
      {reactionCounts.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '0 4px' }}>
          {reactionCounts.map(([emoji, count]) => (
            <span key={emoji} style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,107,139,0.08)', color: '#ff6b8b', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(255,107,139,0.15)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {emoji} {count}
            </span>
          ))}
        </div>
      )}

      {/* ── Comments ── */}
      {showComments && (
        <div style={{ borderTop: '1px solid rgba(255,107,139,0.12)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {post.comments.length === 0
              ? <p style={{ fontSize: '0.8rem', color: '#8c7377', textAlign: 'center', padding: '10px 0' }}>Chưa có bình luận nào. Hãy gửi lời yêu thương! 💬</p>
              : post.comments.map((comment) => {
                  const isMine = String(comment.userId) === String(currentUser.id);
                  const cs     = getCS(comment._id);
                  const cReactions = (() => { const m = {}; (comment.reactions || []).forEach(r => { m[r.emoji] = (m[r.emoji]||0)+1; }); return Object.entries(m); })();

                  return (
                    <div key={comment._id}>
                      {/* Comment bubble */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMine ? '#ff6b8b' : '#e6a100', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem', flexShrink: 0 }}>
                          {comment.displayName?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Bubble */}
                          <div style={{ background: isMine ? 'rgba(255,107,139,0.06)' : 'rgba(230,161,0,0.05)', borderRadius: '14px', padding: '8px 12px', border: isMine ? '1px solid rgba(255,107,139,0.12)' : '1px solid rgba(230,161,0,0.12)', opacity: comment.deleted ? 0.5 : 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isMine ? '#ff6b8b' : '#e6a100' }}>{comment.displayName}</span>
                              <span style={{ fontSize: '0.65rem', color: '#8c7377' }}>{timeAgo(comment.createdAt)}{comment.editedAt && ' · đã sửa'}</span>
                            </div>

                            {/* Editing mode */}
                            {cs.editing && !comment.deleted ? (
                              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                <input
                                  value={cs.editText ?? comment.text}
                                  onChange={e => setCS(comment._id, { editText: e.target.value })}
                                  style={{ flex: 1, padding: '5px 10px', fontSize: '0.82rem', borderRadius: '10px', border: '1px solid #ffd3da', background: 'white' }}
                                  autoFocus
                                  onKeyDown={e => { if (e.key === 'Enter') handleEditComment(comment._id); if (e.key === 'Escape') setCS(comment._id, { editing: false }); }}
                                />
                                <button onClick={() => handleEditComment(comment._id)} style={{ background: '#ff6b8b', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '4px 8px' }}><Check size={12} /></button>
                                <button onClick={() => setCS(comment._id, { editing: false })} style={{ background: 'none', border: '1px solid #ffd3da', borderRadius: '8px', color: '#8c7377', cursor: 'pointer', padding: '4px 8px' }}><X size={12} /></button>
                              </div>
                            ) : (
                              <>
                                {comment.text && <p style={{ fontSize: '0.85rem', color: comment.deleted ? '#8c7377' : '#4a373b', lineHeight: 1.4, margin: 0, fontStyle: comment.deleted ? 'italic' : 'normal' }}>{comment.text}</p>}
                                {comment.imageUrl && !comment.deleted && <img src={comment.imageUrl} alt="" style={{ marginTop: '6px', maxWidth: '100%', borderRadius: '10px', maxHeight: '180px', objectFit: 'cover' }} />}
                              </>
                            )}
                          </div>

                          {/* Comment action row */}
                          {!comment.deleted && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingLeft: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {/* Emoji picker */}
                              <div style={{ position: 'relative' }}>
                                <button onClick={() => setEmojiTarget(emojiTarget === comment._id ? null : comment._id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#8c7377', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px' }}>
                                  <Smile size={12} /> <span style={{ fontSize: '0.7rem' }}>Tim</span>
                                </button>
                                {emojiTarget === comment._id && (
                                  <div style={{ position: 'absolute', bottom: '24px', left: 0, background: 'white', border: '1px solid #ffd3da', borderRadius: '20px', padding: '4px 8px', display: 'flex', gap: '4px', zIndex: 1000, boxShadow: '0 4px 16px rgba(255,107,139,0.18)', whiteSpace: 'nowrap' }}>
                                    {COMMENT_EMOJIS.map(emoji => (
                                      <button key={emoji} onClick={() => handleCommentReact(comment._id, emoji)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 4px', borderRadius: '10px', transition: 'transform 0.15s' }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.35)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                      >{emoji}</button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Reply */}
                              <button onClick={() => setCS(comment._id, { replyOpen: !cs.replyOpen })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#8c7377', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px' }}>
                                <CornerDownRight size={12} /> Trả lời
                              </button>

                              {/* Edit / Delete (own only) */}
                              {isMine && !comment.deleted && (
                                <>
                                  <button onClick={() => setCS(comment._id, { editing: true, editText: comment.text })}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#8c7377', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px' }}>
                                    <Pencil size={11} /> Sửa
                                  </button>
                                  <button onClick={() => handleDeleteComment(comment._id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px' }}>
                                    <Trash2 size={11} /> Xóa
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {/* Reaction pills */}
                          {cReactions.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', paddingLeft: '4px', flexWrap: 'wrap' }}>
                              {cReactions.map(([e, c]) => (
                                <span key={e} style={{ fontSize: '0.7rem', background: 'rgba(255,107,139,0.08)', borderRadius: '12px', padding: '2px 7px', border: '1px solid rgba(255,107,139,0.14)', color: '#ff6b8b', fontWeight: 600 }}>{e} {c}</span>
                              ))}
                            </div>
                          )}

                          {/* ── Replies ── */}
                          {(comment.replies || []).map((reply) => {
                            const rMine = String(reply.userId) === String(currentUser.id);
                            const rs    = getRS(comment._id, reply._id);
                            const rReactions = (() => { const m = {}; (reply.reactions || []).forEach(r => { m[r.emoji]=(m[r.emoji]||0)+1; }); return Object.entries(m); })();

                            return (
                              <div key={reply._id || Math.random()} style={{ marginTop: '6px', marginLeft: '12px', display: 'flex', gap: '6px' }}>
                                <CornerDownRight size={11} color="#c0aab0" style={{ marginTop: '5px', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ background: rMine ? 'rgba(255,107,139,0.05)' : 'rgba(230,161,0,0.04)', borderRadius: '12px', padding: '6px 10px', border: rMine ? '1px solid rgba(255,107,139,0.1)' : '1px solid rgba(230,161,0,0.1)', opacity: reply.deleted ? 0.5 : 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: rMine ? '#ff6b8b' : '#e6a100' }}>
                                        {reply.displayName}
                                        {reply.replyToDisplayName && <span style={{ color: '#ff6b8b', fontWeight: 600 }}> @{reply.replyToDisplayName}</span>}
                                      </span>
                                      <span style={{ fontSize: '0.62rem', color: '#8c7377' }}>{timeAgo(reply.createdAt)}{reply.editedAt && ' · đã sửa'}</span>
                                    </div>

                                    {/* Edit reply mode */}
                                    {rs.editing && !reply.deleted ? (
                                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                        <input
                                          value={rs.editText ?? reply.text}
                                          onChange={e => setRS(comment._id, reply._id, { editText: e.target.value })}
                                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid #ffd3da', background: 'white' }}
                                          autoFocus
                                          onKeyDown={e => { if (e.key === 'Enter') handleEditReply(comment._id, reply._id, rs.editText ?? reply.text); if (e.key === 'Escape') setRS(comment._id, reply._id, { editing: false }); }}
                                        />
                                        <button onClick={() => handleEditReply(comment._id, reply._id, rs.editText ?? reply.text)} style={{ background: '#ff6b8b', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', padding: '3px 7px' }}><Check size={11} /></button>
                                        <button onClick={() => setRS(comment._id, reply._id, { editing: false })} style={{ background: 'none', border: '1px solid #ffd3da', borderRadius: '6px', color: '#8c7377', cursor: 'pointer', padding: '3px 7px' }}><X size={11} /></button>
                                      </div>
                                    ) : (
                                      <>
                                        {reply.text && <p style={{ fontSize: '0.82rem', color: reply.deleted ? '#8c7377' : '#4a373b', margin: 0, fontStyle: reply.deleted ? 'italic' : 'normal' }}>{reply.text}</p>}
                                        {reply.imageUrl && !reply.deleted && <img src={reply.imageUrl} alt="" style={{ marginTop: '4px', maxWidth: '100%', borderRadius: '8px', maxHeight: '140px', objectFit: 'cover' }} />}
                                      </>
                                    )}
                                  </div>

                                  {/* Reply action row */}
                                  {!reply.deleted && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '3px', paddingLeft: '2px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      {/* Reply to reply */}
                                      <button onClick={() => setRS(comment._id, reply._id, { open: !rs.open })}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: '#8c7377', display: 'flex', alignItems: 'center', gap: '2px', padding: '1px 3px' }}>
                                        <CornerDownRight size={11} /> Trả lời
                                      </button>
                                      {rMine && (
                                        <>
                                          <button onClick={() => setRS(comment._id, reply._id, { editing: true, editText: reply.text })}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: '#8c7377', display: 'flex', alignItems: 'center', gap: '2px', padding: '1px 3px' }}>
                                            <Pencil size={10} /> Sửa
                                          </button>
                                          <button onClick={() => handleDeleteReply(comment._id, reply._id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '2px', padding: '1px 3px' }}>
                                            <Trash2 size={10} /> Xóa
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}

                                  {/* Reply reactions */}
                                  {rReactions.length > 0 && (
                                    <div style={{ display: 'flex', gap: '3px', marginTop: '2px', flexWrap: 'wrap' }}>
                                      {rReactions.map(([e, c]) => (
                                        <span key={e} style={{ fontSize: '0.65rem', background: 'rgba(255,107,139,0.06)', borderRadius: '10px', padding: '1px 5px', border: '1px solid rgba(255,107,139,0.12)', color: '#ff6b8b' }}>{e} {c}</span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Reply-to-reply input */}
                                  {rs.open && (
                                    <form onSubmit={(e) => handleSendReplyToReply(e, comment._id, reply._id)}
                                      style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {rs.preview && (
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                          <img src={rs.preview} alt="" style={{ maxHeight: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                                          <button type="button" onClick={() => setRS(comment._id, reply._id, { file: null, preview: '' })}
                                            style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff6b8b', border: 'none', borderRadius: '50%', width: '16px', height: '16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <X size={9} />
                                          </button>
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                        <input type="text"
                                          placeholder={`Trả lời @${reply.displayName}...`}
                                          value={rs.text || ''}
                                          onChange={e => setRS(comment._id, reply._id, { text: e.target.value })}
                                          style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', borderRadius: '10px', border: '1px solid #ffd3da', background: 'white' }}
                                          disabled={rs.loading}
                                        />
                                        <button type="button" onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (ev) => { const f = ev.target.files[0]; if (f) setRS(comment._id, reply._id, { file: f, preview: URL.createObjectURL(f) }); }; inp.click(); }}
                                          style={{ background: 'none', border: '1px solid #ffd3da', borderRadius: '8px', cursor: 'pointer', color: '#8c7377', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
                                          <Image size={12} />
                                        </button>
                                        <button type="submit" className="btn-primary"
                                          style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem' }} disabled={rs.loading}>
                                          <Send size={11} />
                                        </button>
                                      </div>
                                    </form>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Reply to comment input */}
                          {cs.replyOpen && (
                            <form onSubmit={(e) => handleSendReply(e, comment._id)}
                              style={{ marginTop: '8px', marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {cs.replyPreview && (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <img src={cs.replyPreview} alt="" style={{ maxHeight: '90px', borderRadius: '8px', objectFit: 'cover' }} />
                                  <button type="button" onClick={() => setCS(comment._id, { replyFile: null, replyPreview: '' })}
                                    style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff6b8b', border: 'none', borderRadius: '50%', width: '17px', height: '17px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={10} />
                                  </button>
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <input type="text" placeholder="Trả lời..."
                                  value={cs.replyText || ''}
                                  onChange={e => setCS(comment._id, { replyText: e.target.value })}
                                  style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', borderRadius: '12px', border: '1px solid #ffd3da', background: 'white' }}
                                  disabled={cs.replyLoading}
                                />
                                <button type="button" onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (ev) => { const f = ev.target.files[0]; if (f) setCS(comment._id, { replyFile: f, replyPreview: URL.createObjectURL(f) }); }; inp.click(); }}
                                  style={{ background: 'none', border: '1px solid #ffd3da', borderRadius: '10px', cursor: 'pointer', color: '#8c7377', padding: '0 10px', display: 'flex', alignItems: 'center' }}>
                                  <Image size={14} />
                                </button>
                                <button type="submit" className="btn-primary"
                                  style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '0.8rem' }} disabled={cs.replyLoading}>
                                  <Send size={13} />
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>

          {/* New comment input */}
          <form onSubmit={handleSendComment} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            {commentPreview && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={commentPreview} alt="" style={{ maxHeight: '100px', borderRadius: '10px', objectFit: 'cover' }} />
                <button type="button" onClick={() => { setCommentFile(null); setCommentPreview(''); }}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff6b8b', border: 'none', borderRadius: '50%', width: '20px', height: '20px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={11} />
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" placeholder="Gửi tin nhắn phản hồi..."
                value={commentText} onChange={e => setCommentText(e.target.value)}
                style={{ flex: 1, padding: '8px 14px', fontSize: '0.85rem', borderRadius: '12px', border: '1px solid #ffd3da', background: 'white' }}
                disabled={commentLoading}
              />
              <input ref={commentFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) { setCommentFile(f); setCommentPreview(URL.createObjectURL(f)); } }}
              />
              <button type="button" onClick={() => commentFileRef.current?.click()}
                style={{ background: 'none', border: '1px solid #ffd3da', borderRadius: '10px', cursor: 'pointer', color: '#8c7377', padding: '0 10px', display: 'flex', alignItems: 'center' }}>
                <Image size={15} />
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 14px', borderRadius: '12px' }} disabled={commentLoading}>
                <Send size={14} />
              </button>
            </div>
          </form>

          {/* Close emoji picker overlay */}
          {emojiTarget && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setEmojiTarget(null)} />
          )}
        </div>
      )}

      {/* Close post menu overlay */}
      {postMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setPostMenuOpen(false)} />
      )}
    </div>
  );
}
