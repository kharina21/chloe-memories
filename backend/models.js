import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  backgroundUrl: {
    type: String,
    default: ''
  },
  // ── Email verification ──────────────────────────────────────
  email: {
    type: String,
    default: ''
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailOtp: {
    type: String,
    default: null
  },
  emailOtpExpires: {
    type: Date,
    default: null
  },
  // Cooldown: last time we sent a brush email (to throttle)
  lastBrushEmailAt: {
    type: Date,
    default: null
  },
  // ── Partner ─────────────────────────────────────────────────
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  partnerStatus: {
    type: String,
    enum: ['none', 'pending', 'connected'],
    default: 'none'
  },
  currentStatus: {
    type: String,
    default: 'Đang nghĩ về bạn... 💕'
  },
  statusUpdatedAt: {
    type: Date,
    default: Date.now
  },
  anniversaryDate: {
    type: Date,
    default: null
  },
  music: {
    type: {
      source: { type: String, enum: ['youtube', 'zing'], default: 'youtube' },
      id: String,
      title: String,
      artist: String,
      thumbnail: String,
      url: String
    },
    default: null
  }
}, { timestamps: true });

// ── Comment Reaction subdoc ──────────────────────────────────
const CommentReactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji:  { type: String, required: true },
}, { _id: false });

// ── Reply subdoc ─────────────────────────────────────────────
const ReplySchema = new mongoose.Schema({
  userId:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  displayName:         { type: String, required: true },
  text:                { type: String, default: '' },
  imageUrl:            { type: String, default: '' },
  reactions:           [CommentReactionSchema],
  replyToDisplayName:  { type: String, default: '' }, // @mention when replying to a reply
  deleted:             { type: Boolean, default: false },
  editedAt:            { type: Date, default: null },
  createdAt:           { type: Date, default: Date.now }
});

// ── Comment subdoc ───────────────────────────────────────────
const CommentSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  displayName: { type: String, required: true },
  text:        { type: String, default: '' },
  imageUrl:    { type: String, default: '' },
  reactions:   [CommentReactionSchema],
  replies:     [ReplySchema],
  deleted:     { type: Boolean, default: false },
  editedAt:    { type: Date, default: null },
  createdAt:   { type: Date, default: Date.now }
});

// ── Post ─────────────────────────────────────────────────────
const PostSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: ''
  },
  reactions: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      emoji:  { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  comments: [CommentSchema],
  // ─ Soft delete (Trash) ───────────────────────────────────────
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

// ── Notification ─────────────────────────────────────────────
const NotificationSchema = new mongoose.Schema({
  toUser:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromUser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['post', 'comment', 'reply', 'reaction', 'brush', 'music'], required: true },
  postId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  message:   { type: String, required: true },
  read:      { type: Boolean, default: false },
}, { timestamps: true });

const User         = mongoose.model('User', UserSchema);
const Post         = mongoose.model('Post', PostSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

export { User, Post, Notification };
