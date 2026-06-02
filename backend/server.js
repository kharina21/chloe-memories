import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { User, Post } from './models.js';
import { upload, uploadToCloudinary } from './cloudinaryConfig.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretlovetoken12345';

// Middlewares
app.use(cors());
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

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Get Feed (posts shared between user and partner)
app.get('/api/posts/feed', authenticateToken, async (req, res) => {
  try {
    if (!req.user.partnerId || req.user.partnerStatus !== 'connected') {
      return res.json([]);
    }

    // Find all posts where:
    // (sender is User AND recipient is Partner) OR (sender is Partner AND recipient is User)
    const posts = await Post.find({
      $or: [
        { sender: req.user._id, recipient: req.user.partnerId },
        { sender: req.user.partnerId, recipient: req.user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username displayName avatarUrl');

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
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
    res.json(post.reactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Comment on Post
app.post('/api/posts/:postId/comment', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const { postId } = req.params;

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Bình luận không được bỏ trống' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    const newComment = {
      userId: req.user._id,
      displayName: req.user.displayName,
      text: text.trim()
    };

    post.comments.push(newComment);
    await post.save();

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

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running beautifully on port ${PORT}! 🌸`);
});
