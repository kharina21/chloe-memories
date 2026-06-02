import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { User, Post, Notification } from './models.js';
import { upload, uploadToCloudinary } from './cloudinaryConfig.js';
import { sendBrushEmail, sendPostEmail, sendCommentEmail, sendOtpEmail } from './emailService.js';

// __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretlovetoken12345';

// ── Socket.IO setup ────────────────────────────────────────────────────────
export const io = new SocketServer(httpServer, {
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
});

// Socket auth middleware — verify JWT and attach user
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Auth failed'));
  }
});

// Track online users: userId (string) -> socket.id
const onlineUsers = new Map();
export const isOnline = (userId) => onlineUsers.has(String(userId));

// On socket connect — join couple room
io.on('connection', (socket) => {
  const user = socket.user;
  const userId = String(user._id);

  // Register as online
  onlineUsers.set(userId, socket.id);

  // Room name = sorted pair of IDs
  if (user.partnerId && user.partnerStatus === 'connected') {
    const ids = [userId, String(user.partnerId)].sort();
    socket.roomId = `couple:${ids[0]}_${ids[1]}`;
    socket.join(socket.roomId);
    console.log(`💞 ${user.displayName} joined room ${socket.roomId}`);
  }

  // Brush position relay + email cooldown
  socket.on('brush:move', async (data) => {
    // Relay to partner
    if (socket.roomId) {
      socket.to(socket.roomId).emit('brush:move', data);
    }

    // Email notification — only if partner is OFFLINE and cooldown passed
    if (user.partnerId && user.partnerStatus === 'connected' && !isOnline(String(user.partnerId))) {
      try {
        const freshUser = await User.findById(user._id);
        const now = Date.now();
        const FIVE_MIN = 5 * 60 * 1000;
        if (!freshUser.lastBrushEmailAt || (now - new Date(freshUser.lastBrushEmailAt).getTime()) > FIVE_MIN) {
          const partner = await User.findById(user.partnerId);
          if (partner?.email && partner?.emailVerified) {
            await sendBrushEmail(partner.email, freshUser.displayName);
            freshUser.lastBrushEmailAt = new Date();
            await freshUser.save();
            console.log(`📧 Brush email sent to ${partner.email}`);
          }
        }
      } catch (err) {
        console.error('Brush email error:', err.message);
      }
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    console.log(`💔 ${user.displayName} disconnected`);
  });
});

// CORS — open for all origins (frontend served from same Express in production)
// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];    

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// ================= AUTH ROUTES =================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã được sử dụng' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      displayName
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        partnerStatus: user.partnerStatus,
        partnerId: user.partnerId
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        partnerStatus: user.partnerStatus,
        partnerId: user.partnerId,
        anniversaryDate: user.anniversaryDate
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Get User Profile Detail
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('partnerId', 'username displayName avatarUrl currentStatus statusUpdatedAt');
    
    res.json({
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      backgroundUrl: user.backgroundUrl,
      email: user.email,
      emailVerified: user.emailVerified,
      partnerId: user.partnerId,
      partnerStatus: user.partnerStatus,
      currentStatus: user.currentStatus,
      statusUpdatedAt: user.statusUpdatedAt,
      anniversaryDate: user.anniversaryDate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// ================= PARTNER ROUTES =================

// Link partner
app.post('/api/partner/connect', authenticateToken, async (req, res) => {
  try {
    const { partnerUsername } = req.body;

    if (!partnerUsername) {
      return res.status(400).json({ message: 'Vui lòng nhập tên tài khoản đối phương' });
    }

    if (partnerUsername.toLowerCase() === req.user.username) {
      return res.status(400).json({ message: 'Bạn không thể kết nối với chính mình' });
    }

    const partner = await User.findOne({ username: partnerUsername.toLowerCase() });
    if (!partner) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng này' });
    }

    // Check if partner is already connected to someone else
    if (partner.partnerId && partner.partnerStatus === 'connected' && String(partner.partnerId) !== String(req.user._id)) {
      return res.status(400).json({ message: 'Người này đã kết nối với một tài khoản khác' });
    }

    const currentUser = req.user;

    // Check mutual connection
    if (partner.partnerId && String(partner.partnerId) === String(currentUser._id)) {
      // Complete connection
      currentUser.partnerId = partner._id;
      currentUser.partnerStatus = 'connected';
      
      partner.partnerStatus = 'connected';

      await currentUser.save();
      await partner.save();

      return res.json({
        message: 'Kết nối thành công! Hai bạn đã thuộc về nhau 💕',
        partner: {
          id: partner._id,
          username: partner.username,
          displayName: partner.displayName
        },
        partnerStatus: 'connected'
      });
    } else {
      // Send connection request
      currentUser.partnerId = partner._id;
      currentUser.partnerStatus = 'pending';
      await currentUser.save();

      return res.json({
        message: 'Đã gửi lời mời kết nối! Chờ đối phương kết nối lại với bạn 🕒',
        partnerStatus: 'pending'
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Disconnect partner
app.post('/api/partner/disconnect', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const partnerId = currentUser.partnerId;

    currentUser.partnerId = null;
    currentUser.partnerStatus = 'none';
    await currentUser.save();

    if (partnerId) {
      const partner = await User.findById(partnerId);
      if (partner && String(partner.partnerId) === String(currentUser._id)) {
        partner.partnerId = null;
        partner.partnerStatus = 'none';
        await partner.save();
      }
    }

    res.json({ message: 'Đã hủy kết nối!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// ================= POSTS ROUTES =================

// Upload Locket Photo
app.post('/api/posts/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn hình ảnh để đăng' });
    }

    if (!req.user.partnerId || req.user.partnerStatus !== 'connected') {
      return res.status(400).json({ message: 'Bạn cần kết nối với người yêu trước khi chia sẻ khoảnh khắc!' });
    }

    // Upload to Cloudinary
    let uploadResult;
    try {
      uploadResult = await uploadToCloudinary(req.file.buffer);
    } catch (uploadErr) {
      console.error('Cloudinary upload failure:', uploadErr);
      return res.status(500).json({ message: 'Lỗi tải ảnh lên đám mây Cloudinary. Vui lòng kiểm tra lại cấu hình CLOUDINARY_CLOUD_NAME.' });
    }

    // Save post
    const post = new Post({
      sender: req.user._id,
      recipient: req.user.partnerId,
      imageUrl: uploadResult.secure_url,
      caption: req.body.caption || ''
    });

    await post.save();

    // Return post with sender populated
    const populatedPost = await Post.findById(post._id)
      .populate('sender', 'username displayName avatarUrl');

    // 🔔 Real-time socket
    const ids = [String(req.user._id), String(req.user.partnerId)].sort();
    io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:new', populatedPost);

    // 🔔 Create notification for partner
    const notif = await Notification.create({
      toUser:   req.user.partnerId,
      fromUser: req.user._id,
      type:     'post',
      postId:   post._id,
      message:  `${req.user.displayName} vừa đăng ảnh mới cho bạn! 📸`,
    });
    io.to(`couple:${ids[0]}_${ids[1]}`).emit('notification:new', notif);

    // 🔔 Email if partner offline
    if (!isOnline(String(req.user.partnerId))) {
      try {
        const partner = await User.findById(req.user.partnerId);
        if (partner?.email && partner?.emailVerified) {
          await sendPostEmail(partner.email, req.user.displayName, req.user.currentStatus, populatedPost.imageUrl);
        }
      } catch (emailErr) { console.error('Post email error:', emailErr.message); }
    }

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Get Feed (posts shared between user and partner, excluding deleted)
app.get('/api/posts/feed', authenticateToken, async (req, res) => {
  try {
    if (!req.user.partnerId || req.user.partnerStatus !== 'connected') {
      return res.json([]);
    }
    const posts = await Post.find({
      $or: [
        { sender: req.user._id, recipient: req.user.partnerId },
        { sender: req.user.partnerId, recipient: req.user._id }
      ],
      isDeleted: { $ne: true }   // ← exclude soft-deleted
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username displayName avatarUrl');
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// ─── Trash: soft-delete a post ───────────────────────────────────────────
app.delete('/api/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    if (String(post.sender) !== String(req.user._id))
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài này' });
    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();
    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:deleted', { postId: post._id });
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi máy chủ' }); }
});

// ─── Trash: get trashed posts ─────────────────────────────────────────────
app.get('/api/posts/trash', authenticateToken, async (req, res) => {
  try {
    if (!req.user.partnerId) return res.json([]);
    const posts = await Post.find({
      $or: [
        { sender: req.user._id, recipient: req.user.partnerId },
        { sender: req.user.partnerId, recipient: req.user._id }
      ],
      isDeleted: true
    })
      .sort({ deletedAt: -1 })
      .populate('sender', 'username displayName avatarUrl');
    res.json(posts);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi máy chủ' }); }
});

// ─── Trash: restore a post ────────────────────────────────────────────────
app.put('/api/posts/:postId/restore', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    if (String(post.sender) !== String(req.user._id))
      return res.status(403).json({ message: 'Bạn không có quyền khôi phục bài này' });
    post.isDeleted = false;
    post.deletedAt = null;
    await post.save();
    const restored = await Post.findById(post._id).populate('sender', 'username displayName avatarUrl');
    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:new', restored);
    }
    res.json(restored);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi máy chủ' }); }
});

// ─── Edit a comment ───────────────────────────────────────────────────────
app.put('/api/posts/:postId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    if (String(comment.userId) !== String(req.user._id))
      return res.status(403).json({ message: 'Không có quyền sửa' });
    comment.text = (text || '').trim();
    comment.editedAt = new Date();
    await post.save();
    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:comment', { postId: post._id, comments: post.comments });
    }
    res.json(post.comments);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi máy chủ' }); }
});

// ─── Delete a comment ─────────────────────────────────────────────────────
app.delete('/api/posts/:postId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    if (String(comment.userId) !== String(req.user._id))
      return res.status(403).json({ message: 'Không có quyền xóa' });
    comment.deleted = true;
    comment.text = '[Đã xóa]';
    await post.save();
    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:comment', { postId: post._id, comments: post.comments });
    }
    res.json(post.comments);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi máy chủ' }); }
});

// ─── Reply to a reply (flat model: adds to same replies array) ────────────
app.post('/api/posts/:postId/comments/:commentId/replies/:replyId/reply', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { text } = req.body;
    const { postId, commentId, replyId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    const targetReply = comment.replies.id(replyId);

    let imageUrl = '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'thoiu-comments');
      imageUrl = result.secure_url;
    }
    comment.replies.push({
      userId:             req.user._id,
      displayName:        req.user.displayName,
      text:               (text || '').trim(),
      imageUrl,
      replyToDisplayName: targetReply?.displayName || '',
    });
    await post.save();
    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:comment', { postId: post._id, comments: post.comments });
    }
    res.json(post.comments);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi máy chủ' }); }
});

// ─── Edit a reply ─────────────────────────────────────────────────────────
app.put('/api/posts/:postId/comments/:commentId/replies/:replyId', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const { postId, commentId, replyId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ message: 'Không tìm thấy trả lời' });
    if (String(reply.userId) !== String(req.user._id))
      return res.status(403).json({ message: 'Không có quyền sửa' });
    reply.text = (text || '').trim();
    reply.editedAt = new Date();
    await post.save();
    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:comment', { postId: post._id, comments: post.comments });
    }
    res.json(post.comments);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi máy chủ' }); }
});

// ─── Delete a reply ───────────────────────────────────────────────────────
app.delete('/api/posts/:postId/comments/:commentId/replies/:replyId', authenticateToken, async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ message: 'Không tìm thấy trả lời' });
    if (String(reply.userId) !== String(req.user._id))
      return res.status(403).json({ message: 'Không có quyền xóa' });
    reply.deleted = true;
    reply.text = '[Đã xóa]';
    await post.save();
    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:comment', { postId: post._id, comments: post.comments });
    }
    res.json(post.comments);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi máy chủ' }); }
});

// React to Post
app.post('/api/posts/:postId/react', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const { postId } = req.params;

    if (!emoji) {
      return res.status(400).json({ message: 'Vui lòng cung cấp biểu cảm' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    // Find existing reaction from this user
    const existingReactionIndex = post.reactions.findIndex(
      (r) => String(r.userId) === String(req.user._id)
    );

    if (existingReactionIndex > -1) {
      if (post.reactions[existingReactionIndex].emoji === emoji) {
        // Toggle off if same emoji
        post.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update if different emoji
        post.reactions[existingReactionIndex].emoji = emoji;
        post.reactions[existingReactionIndex].createdAt = new Date();
      }
    } else {
      // Add new reaction
      post.reactions.push({
        userId: req.user._id,
        emoji
      });
    }

    await post.save();

    // 🔔 Notify couple room in real-time
    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:reaction', { postId: post._id, reactions: post.reactions });
    }

    res.json(post.reactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Comment on Post (text + optional imageUrl from prior upload)
app.post('/api/posts/:postId/comment', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { text } = req.body;
    const { postId } = req.params;

    if ((!text || text.trim() === '') && !req.file) {
      return res.status(400).json({ message: 'Bình luận không được bỏ trống' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });

    let imageUrl = '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'thoiu-comments');
      imageUrl = result.secure_url;
    }

    const newComment = {
      userId:      req.user._id,
      displayName: req.user.displayName,
      text:        (text || '').trim(),
      imageUrl,
    };

    post.comments.push(newComment);
    await post.save();

    // 🔔 Real-time socket
    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:comment', { postId: post._id, comments: post.comments });

      // Notification
      const notif = await Notification.create({
        toUser:   req.user.partnerId,
        fromUser: req.user._id,
        type:     'comment',
        postId:   post._id,
        message:  `${req.user.displayName} đã bình luận vào ảnh của bạn 💬`,
      });
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('notification:new', notif);

      // Email if partner offline
      if (!isOnline(String(req.user.partnerId))) {
        try {
          const partner = await User.findById(req.user.partnerId);
          if (partner?.email && partner?.emailVerified) {
            await sendCommentEmail(partner.email, req.user.displayName, (text || '').trim() || '🖼️ [hình ảnh]', false);
          }
        } catch (emailErr) { console.error('Comment email error:', emailErr.message); }
      }
    }

    res.json(post.comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// React to a specific comment
app.post('/api/posts/:postId/comments/:commentId/react', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const { postId, commentId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });

    const idx = comment.reactions.findIndex(r => String(r.userId) === String(req.user._id));
    if (idx > -1) {
      if (comment.reactions[idx].emoji === emoji) comment.reactions.splice(idx, 1);
      else comment.reactions[idx].emoji = emoji;
    } else {
      comment.reactions.push({ userId: req.user._id, emoji });
    }
    await post.save();

    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:comment', { postId: post._id, comments: post.comments });
    }
    res.json(post.comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Reply to a comment
app.post('/api/posts/:postId/comments/:commentId/reply', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { text } = req.body;
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });

    let imageUrl = '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'thoiu-comments');
      imageUrl = result.secure_url;
    }

    comment.replies.push({
      userId:      req.user._id,
      displayName: req.user.displayName,
      text:        (text || '').trim(),
      imageUrl,
    });
    await post.save();

    if (req.user.partnerId) {
      const ids = [String(req.user._id), String(req.user.partnerId)].sort();
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('post:comment', { postId: post._id, comments: post.comments });

      const notif = await Notification.create({
        toUser:   req.user.partnerId,
        fromUser: req.user._id,
        type:     'reply',
        postId:   post._id,
        message:  `${req.user.displayName} đã trả lời bình luận của bạn ↩️`,
      });
      io.to(`couple:${ids[0]}_${ids[1]}`).emit('notification:new', notif);

      if (!isOnline(String(req.user.partnerId))) {
        try {
          const partner = await User.findById(req.user.partnerId);
          if (partner?.email && partner?.emailVerified) {
            await sendCommentEmail(partner.email, req.user.displayName, (text || '').trim() || '🖼️ [hình ảnh]', true);
          }
        } catch (emailErr) { console.error('Reply email error:', emailErr.message); }
      }
    }

    res.json(post.comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// ================= USER PROFILE WIDGETS =================

// Update Current Status (eating, studying, etc.)
app.put('/api/user/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || status.trim() === '') {
      return res.status(400).json({ message: 'Trạng thái không được bỏ trống' });
    }

    req.user.currentStatus = status.trim();
    req.user.statusUpdatedAt = new Date();
    await req.user.save();

    res.json({
      currentStatus: req.user.currentStatus,
      statusUpdatedAt: req.user.statusUpdatedAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Update Anniversary Date
app.put('/api/user/anniversary', authenticateToken, async (req, res) => {
  try {
    const { anniversaryDate } = req.body;
    if (!anniversaryDate) {
      return res.status(400).json({ message: 'Vui lòng chọn ngày kỷ niệm' });
    }

    req.user.anniversaryDate = new Date(anniversaryDate);
    await req.user.save();

    // Sync partner anniversary if connected
    if (req.user.partnerId && req.user.partnerStatus === 'connected') {
      const partner = await User.findById(req.user.partnerId);
      if (partner) {
        partner.anniversaryDate = new Date(anniversaryDate);
        await partner.save();
      }
    }

    res.json({ anniversaryDate: req.user.anniversaryDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Update Avatar
app.put('/api/user/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh đại diện' });
    }

    let uploadResult;
    try {
      uploadResult = await uploadToCloudinary(req.file.buffer, 'thoiu-avatars');
    } catch (uploadErr) {
      console.error('Avatar upload error:', uploadErr);
      return res.status(500).json({ message: 'Lỗi tải ảnh lên Cloudinary' });
    }

    req.user.avatarUrl = uploadResult.secure_url;
    await req.user.save();

    res.json({ avatarUrl: req.user.avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Update Background Image
app.put('/api/user/background', authenticateToken, upload.single('background'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh nền' });
    }

    let uploadResult;
    try {
      uploadResult = await uploadToCloudinary(req.file.buffer, 'thoiu-backgrounds');
    } catch (uploadErr) {
      console.error('Background upload error:', uploadErr);
      return res.status(500).json({ message: 'Lỗi tải ảnh nền lên Cloudinary' });
    }

    req.user.backgroundUrl = uploadResult.secure_url;
    await req.user.save();

    res.json({ backgroundUrl: req.user.backgroundUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// ================= EMAIL VERIFICATION =================

// Send OTP to email
app.post('/api/user/email/send-otp', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    req.user.email = email.trim().toLowerCase();
    req.user.emailOtp = otp;
    req.user.emailOtpExpires = expires;
    req.user.emailVerified = false;
    await req.user.save();

    await sendOtpEmail(email, otp);
    res.json({ message: 'Mã OTP đã được gửi tới email của bạn!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi gửi email: ' + err.message });
  }
});

// Confirm OTP
app.post('/api/user/email/confirm-otp', authenticateToken, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: 'Vui lòng nhập mã OTP' });

    if (req.user.emailOtp !== otp) {
      return res.status(400).json({ message: 'Mã OTP không đúng' });
    }
    if (new Date() > req.user.emailOtpExpires) {
      return res.status(400).json({ message: 'Mã OTP đã hết hạn, vui lòng gửi lại' });
    }

    req.user.emailVerified = true;
    req.user.emailOtp = null;
    req.user.emailOtpExpires = null;
    await req.user.save();

    res.json({ message: 'Email đã được xác thực thành công! 🎉', email: req.user.email, emailVerified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// ================= NOTIFICATIONS =================

// Get notifications for current user (latest 30)
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifs = await Notification.find({ toUser: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('fromUser', 'displayName avatarUrl');
    res.json(notifs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Mark specific notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, toUser: req.user._id },
      { read: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ toUser: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// ── Serve React build in production (same pattern as AcquyThanhtu) ──────────
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback — Express 5 compatible (no bare '*' wildcard)
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`📦 Serving React build from: ${clientDist}`);
}

// Start Server
httpServer.listen(PORT, () => {
  console.log(`Server is running beautifully on port ${PORT}! 🌸`);
});
