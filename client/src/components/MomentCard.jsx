import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, CornerDownRight, Image, X, Smile } from 'lucide-react';

const COMMENT_EMOJIS = ['❤️', '😍', '😂', '🥺', '👏', '🔥'];
const POST_EMOJIS    = ['❤️', '😍', '😘', '🥺', '😂', '🎉'];

// ── tiny helper ─────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

// ── Avatar bubble ────────────────────────────────────────────────────────────
function Avatar({ user, size = 34, isMine }) {
  const bg = isMine ? '#ff6b8b' : '#e6a100';
  return user?.avatarUrl
    ? <img src={user.avatarUrl} alt={user.displayName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${bg}` }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.4, border: `2px solid ${bg}`, flexShrink: 0 }}>
        {user?.displayName?.charAt(0).toUpperCase()}
      </div>;
}

export default function MomentCard({ post, currentUser, onReact, onComment, apiBase, token, autoOpenComments, highlight }) {
  const [showComments, setShowComments] = useState(false);

  // Auto-open comments when navigated from notification
  useEffect(() => {
    if (autoOpenComments) {
      setShowComments(true);
    }
  }, [autoOpenComments]);

  // New top-level comment
  const [commentText, setCommentText]   = useState('');
  const [commentFile, setCommentFile]   = useState(null);
  const [commentPreview, setCommentPreview] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Reply state: commentId → {text, file, preview}
  const [replyState, setReplyState] = useState({}); // { [commentId]: { text, file, preview, loading, open } }

  // Emoji picker open: commentId | 'post' | null
  const [emojiTarget, setEmojiTarget] = useState(null);

  const cardRef         = useRef(null);
  const commentFileRef  = useRef(null);

  // ── floating hearts ────────────────────────────────────────
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

  // ── Post reaction ──────────────────────────────────────────
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

  // ── Send top-level comment ─────────────────────────────────
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
      if (res.ok) {
        onComment(post._id, data);
        setCommentText('');
        setCommentFile(null);
        setCommentPreview('');
      }
    } catch {}
    finally { setCommentLoading(false); }
  };

  // ── Comment emoji reaction ─────────────────────────────────
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

  // ── Reply helpers ──────────────────────────────────────────
  const getReply = (cid) => replyState[cid] || { text: '', file: null, preview: '', loading: false, open: false };
  const setReply = (cid, patch) => setReplyState(prev => ({ ...prev, [cid]: { ...getReply(cid), ...patch } }));

  const handleSendReply = async (e, commentId) => {
    e.preventDefault();
    const r = getReply(commentId);
    if (!r.text.trim() && !r.file) return;
    setReply(commentId, { loading: true });
    try {
      const fd = new FormData();
      if (r.text.trim()) fd.append('text', r.text.trim());
      if (r.file) fd.append('image', r.file);

      const res = await fetch(`${apiBase}/api/posts/${post._id}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        onComment(post._id, data);
        setReply(commentId, { text: '', file: null, preview: '', open: false });
      }
    } catch {}
    finally { setReply(commentId, { loading: false }); }
  };

  // ── Aggregated post reactions ──────────────────────────────
  const reactionCounts = (() => {
    const m = {};
    post.reactions.forEach(r => { m[r.emoji] = (m[r.emoji] || 0) + 1; });
    return Object.entries(m);
  })();

  const myPostReaction = post.reactions.find(r => String(r.userId) === String(currentUser.id))?.emoji;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div
      id={`post-${String(post._id)}`}
      ref={cardRef}
      className="glass-card animate-fade-in"
      style={{
        padding: '16px',
        width: '100%',
        marginBottom: '20px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'box-shadow 0.4s ease',
        ...(highlight ? { boxShadow: '0 0 0 3px #ff6b8b, 0 8px 32px rgba(255,107,139,0.35)' } : {}),
      }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Avatar user={post.sender} isMine={post.sender._id === currentUser.id} />
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4a3e40' }}>{post.sender.displayName}</div>
          <div style={{ fontSize: '0.72rem', color: '#8c7377' }}>{timeAgo(post.createdAt)}</div>
        </div>
      </div>

      {/* Post image */}
      <div style={{ borderRadius: '20px', overflow: 'hidden', border: '3px solid white', boxShadow: '0 8px 16px rgba(255,107,139,0.08)', position: 'relative', aspectRatio: '1', backgroundColor: '#f8f9fa' }}>
        <img src={post.imageUrl} alt="Locket moment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {post.caption && (
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 12px', borderRadius: '16px', fontSize: '0.85rem', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
            {post.caption}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        {/* Emoji picker toggle for post */}
        <div style={{ position: 'relative' }}>
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
        </div>

        {/* Comment toggle */}
        <button onClick={() => setShowComments(!showComments)}
          style={{ background: 'none', border: 'none', color: showComments ? '#ff6b8b' : '#8c7377', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
          <MessageCircle size={18} />
          <span>Bình luận ({post.comments.length})</span>
        </button>
      </div>

      {/* Post reaction counts */}
      {reactionCounts.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '0 4px' }}>
          {reactionCounts.map(([emoji, count]) => (
            <span key={emoji} style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,107,139,0.08)', color: '#ff6b8b', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(255,107,139,0.15)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {emoji} {count}
            </span>
          ))}
        </div>
      )}

      {/* ── Comment section ──────────────────────────────────── */}
      {showComments && (
        <div style={{ borderTop: '1px solid rgba(255,107,139,0.12)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Comments list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
            {post.comments.length === 0
              ? <p style={{ fontSize: '0.8rem', color: '#8c7377', textAlign: 'center', padding: '10px 0' }}>Chưa có bình luận nào. Hãy gửi lời yêu thương! 💬</p>
              : post.comments.map((comment) => {
                  const isMine = String(comment.userId) === String(currentUser.id);
                  const r      = getReply(comment._id);
                  // emoji reaction summary on this comment
                  const cReactions = (() => {
                    const m = {};
                    (comment.reactions || []).forEach(r => { m[r.emoji] = (m[r.emoji] || 0) + 1; });
                    return Object.entries(m);
                  })();

                  return (
                    <div key={comment._id}>
                      {/* Comment bubble */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMine ? '#ff6b8b' : '#e6a100', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem', flexShrink: 0 }}>
                          {comment.displayName?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ background: isMine ? 'rgba(255,107,139,0.06)' : 'rgba(230,161,0,0.05)', borderRadius: '14px', padding: '8px 12px', border: isMine ? '1px solid rgba(255,107,139,0.12)' : '1px solid rgba(230,161,0,0.12)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isMine ? '#ff6b8b' : '#e6a100' }}>{comment.displayName}</span>
                              <span style={{ fontSize: '0.65rem', color: '#8c7377' }}>{timeAgo(comment.createdAt)}</span>
                            </div>
                            {comment.text && <p style={{ fontSize: '0.85rem', color: '#4a373b', lineHeight: 1.4, margin: 0 }}>{comment.text}</p>}
                            {comment.imageUrl && (
                              <img src={comment.imageUrl} alt="comment img" style={{ marginTop: '6px', maxWidth: '100%', borderRadius: '10px', maxHeight: '180px', objectFit: 'cover' }} />
                            )}
                          </div>

                          {/* Comment actions */}
                          <div style={{ display: 'flex', gap: '10px', marginTop: '4px', paddingLeft: '4px', alignItems: 'center' }}>
                            {/* Emoji button */}
                            <div style={{ position: 'relative' }}>
                              <button onClick={() => setEmojiTarget(emojiTarget === comment._id ? null : comment._id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#8c7377', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 4px' }}>
                                <Smile size={13} /> <span style={{ fontSize: '0.72rem' }}>Thả tim</span>
                              </button>
                              {emojiTarget === comment._id && (
                                <div style={{ position: 'absolute', bottom: '28px', left: 0, background: 'white', border: '1px solid #ffd3da', borderRadius: '20px', padding: '4px 8px', display: 'flex', gap: '4px', zIndex: 1000, boxShadow: '0 4px 16px rgba(255,107,139,0.18)', whiteSpace: 'nowrap' }}>
                                  {COMMENT_EMOJIS.map(emoji => (
                                    <button key={emoji} onClick={() => handleCommentReact(comment._id, emoji)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.15rem', padding: '2px 4px', borderRadius: '10px', transition: 'transform 0.15s' }}
                                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.35)'}
                                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >{emoji}</button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Reply button */}
                            <button onClick={() => setReply(comment._id, { open: !r.open })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#8c7377', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 4px' }}>
                              <CornerDownRight size={13} /> Trả lời
                            </button>
                          </div>

                          {/* Comment reactions display */}
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
                            return (
                              <div key={reply._id || Math.random()} style={{ marginTop: '6px', marginLeft: '12px', display: 'flex', gap: '6px' }}>
                                <CornerDownRight size={12} color="#c0aab0" style={{ marginTop: '4px', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ background: rMine ? 'rgba(255,107,139,0.05)' : 'rgba(230,161,0,0.04)', borderRadius: '12px', padding: '6px 10px', border: rMine ? '1px solid rgba(255,107,139,0.1)' : '1px solid rgba(230,161,0,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: rMine ? '#ff6b8b' : '#e6a100' }}>{reply.displayName}</span>
                                      <span style={{ fontSize: '0.62rem', color: '#8c7377' }}>{timeAgo(reply.createdAt)}</span>
                                    </div>
                                    {reply.text && <p style={{ fontSize: '0.82rem', color: '#4a373b', margin: 0 }}>{reply.text}</p>}
                                    {reply.imageUrl && <img src={reply.imageUrl} alt="reply" style={{ marginTop: '4px', maxWidth: '100%', borderRadius: '8px', maxHeight: '140px', objectFit: 'cover' }} />}
                                  </div>
                                  {/* Reply reactions */}
                                  {(reply.reactions || []).length > 0 && (
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                                      {Object.entries((() => { const m = {}; reply.reactions.forEach(r => { m[r.emoji] = (m[r.emoji]||0)+1; }); return m; })()).map(([e, c]) => (
                                        <span key={e} style={{ fontSize: '0.65rem', background: 'rgba(255,107,139,0.06)', borderRadius: '10px', padding: '1px 6px', border: '1px solid rgba(255,107,139,0.12)', color: '#ff6b8b' }}>{e} {c}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Reply input box */}
                          {r.open && (
                            <form onSubmit={(e) => handleSendReply(e, comment._id)}
                              style={{ marginTop: '8px', marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {r.preview && (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <img src={r.preview} alt="preview" style={{ maxHeight: '100px', borderRadius: '8px', objectFit: 'cover' }} />
                                  <button type="button" onClick={() => setReply(comment._id, { file: null, preview: '' })}
                                    style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff6b8b', border: 'none', borderRadius: '50%', width: '18px', height: '18px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={10} />
                                  </button>
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <input type="text" placeholder="Trả lời..."
                                  value={r.text} onChange={e => setReply(comment._id, { text: e.target.value })}
                                  style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', borderRadius: '12px', border: '1px solid #ffd3da', background: 'white' }}
                                  disabled={r.loading}
                                />
                                <button type="button" onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (ev) => { const f = ev.target.files[0]; if (f) setReply(comment._id, { file: f, preview: URL.createObjectURL(f) }); }; inp.click(); }}
                                  style={{ background: 'none', border: '1px solid #ffd3da', borderRadius: '10px', cursor: 'pointer', color: '#8c7377', padding: '0 10px', display: 'flex', alignItems: 'center' }}>
                                  <Image size={14} />
                                </button>
                                <button type="submit" className="btn-primary"
                                  style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '0.8rem' }} disabled={r.loading}>
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

          {/* ── New comment input ────────────────────────────── */}
          <form onSubmit={handleSendComment} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            {/* Image preview */}
            {commentPreview && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={commentPreview} alt="preview" style={{ maxHeight: '100px', borderRadius: '10px', objectFit: 'cover' }} />
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
              {/* Image picker */}
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

          {/* Close emoji picker when clicking outside */}
          {emojiTarget && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setEmojiTarget(null)} />
          )}
        </div>
      )}
    </div>
  );
}
