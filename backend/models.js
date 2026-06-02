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
  }
}, { timestamps: true });

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
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      emoji: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  comments: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      displayName: {
        type: String,
        required: true
      },
      text: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);

export { User, Post };
