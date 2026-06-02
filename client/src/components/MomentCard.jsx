import React, { useState, useRef } from 'react';
import { MessageCircle, Heart, Send } from 'lucide-react';

export default function MomentCard({ post, currentUser, onReact, onComment, apiBase, token }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  
  const cardRef = useRef(null);

  // Reaction emojis
  const emojiList = ['❤️', '😍', '😘', '🥺', '😂', '🎉'];

  // Format relative time
  const formatTime = (dateStr) => {
    const postDate = new Date(dateStr);
    const now = new Date();
    const diffMs = Math.abs(now - postDate);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  // Spark floating hearts
  const createFloatingHeart = (emoji, x, y) => {
    if (!cardRef.current) return;
    
    // Create heart elements
    const count = 5;
    for (let i = 0; i < count; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart-float';
      heart.innerText = emoji;
      
      // Randomize movement path slightly
      const randomLeft = (Math.random() - 0.5) * 60; // offset from center
      const randomDelay = Math.random() * 0.2;
      
      heart.style.left = `${x + randomLeft}px`;
      heart.style.top = `${y}px`;
      heart.style.animationDelay = `${randomDelay}s`;
      
      cardRef.current.appendChild(heart);
      
      // Cleanup
      setTimeout(() => {
        heart.remove();
      }, 2000);
    }
  };

  const handleReactClick = async (e, emoji) => {
    // Get mouse coordinates for animation anchor
    const rect = cardRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    createFloatingHeart(emoji, clickX, clickY);

    try {
      const res = await fetch(`${apiBase}/api/posts/${post._id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      onReact(post._id, data);
    } catch (err) {
      console.error('Lỗi khi thả cảm xúc:', err);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/posts/${post._id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: commentText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      onComment(post._id, data);
      setCommentText('');
    } catch (err) {
      console.error('Lỗi khi gửi bình luận:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Group reactions to display counts
  const getReactionCounts = () => {
    const counts = {};
    post.reactions.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return Object.entries(counts);
  };

  const activeReactions = getReactionCounts();

  return (
    <div 
      ref={cardRef}
      className="glass-card animate-fade-in" 
      style={{ 
        padding: '16px', 
        width: '100%', 
        marginBottom: '20px', 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: post.sender._id === currentUser.id ? '#ff6b8b' : '#e6a100',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.95rem'
          }}>
            {post.sender.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4a3e40' }}>
              {post.sender.displayName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8c7377' }}>
              {formatTime(post.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Image */}
      <div style={{
        borderRadius: '20px',
        overflow: 'hidden',
        border: '3px solid white',
        boxShadow: '0 8px 16px rgba(255, 107, 139, 0.08)',
        position: 'relative',
        aspectRatio: '1',
        width: '100%',
        backgroundColor: '#f8f9fa'
      }}>
        <img
          src={post.imageUrl}
          alt="Locket moment"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Caption Overlay */}
        {post.caption && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '16px',
            fontSize: '0.85rem',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
          }}>
            {post.caption}
          </div>
        )}
      </div>

      {/* Action Bar (Reactions Display & Interaction) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        
        {/* Reaction Picker */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'rgba(255,255,255,0.7)',
          padding: '4px 8px',
          borderRadius: '24px',
          border: '1px solid #ffd3da'
        }}>
          {emojiList.map((emoji) => {
            const hasReacted = post.reactions.some(
              (r) => String(r.userId) === String(currentUser.id) && r.emoji === emoji
            );
            return (
              <button
                key={emoji}
                onClick={(e) => handleReactClick(e, emoji)}
                style={{
                  background: hasReacted ? '#ffd3da' : 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  transition: 'transform 0.15s ease',
                  transform: hasReacted ? 'scale(1.2)' : 'none'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.3)'}
                onMouseOut={(e) => e.target.style.transform = hasReacted ? 'scale(1.2)' : 'scale(1)'}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {/* Action Toggle buttons */}
        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            background: 'none',
            border: 'none',
            color: showComments ? '#ff6b8b' : '#8c7377',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <MessageCircle size={18} />
          <span>Bình luận ({post.comments.length})</span>
        </button>
      </div>

      {/* Active Reactions Counts */}
      {activeReactions.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '0 4px' }}>
          {activeReactions.map(([emoji, count]) => (
            <span
              key={emoji}
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'rgba(255, 107, 139, 0.08)',
                color: '#ff6b8b',
                padding: '4px 10px',
                borderRadius: '20px',
                fontWeight: 600,
                border: '1px solid rgba(255, 107, 139, 0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{emoji}</span>
              <span>{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Comment Section (Slide Down Drawer-like panel) */}
      {showComments && (
        <div style={{
          marginTop: '4px',
          borderTop: '1px solid rgba(255, 107, 139, 0.12)',
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          
          {/* Comments List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
            {post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <div key={comment._id} style={{
                  backgroundColor: comment.userId === currentUser.id ? 'rgba(255, 107, 139, 0.04)' : 'rgba(230, 161, 0, 0.03)',
                  padding: '8px 12px',
                  borderRadius: '14px',
                  border: comment.userId === currentUser.id ? '1px solid rgba(255, 107, 139, 0.08)' : '1px solid rgba(230, 161, 0, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: comment.userId === currentUser.id ? '#ff6b8b' : '#e6a100' }}>
                      {comment.displayName}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#8c7377' }}>
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#4a373b', lineHeight: 1.3 }}>{comment.text}</p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.8rem', color: '#8c7377', textAlign: 'center', padding: '10px 0' }}>
                Chưa có bình luận nào. Hãy gửi lời yêu thương! 💬
              </p>
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleSendComment} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input
              type="text"
              placeholder="Gửi tin nhắn phản hồi..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{
                padding: '8px 14px',
                fontSize: '0.85rem',
                borderRadius: '12px',
                border: '1px solid #ffd3da',
                backgroundColor: 'white'
              }}
              disabled={commentLoading}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '8px 14px', borderRadius: '12px' }}
              disabled={commentLoading}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
