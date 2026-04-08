const mongoose = require('mongoose');

const commitmentPodSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  podName: {
    type: String,
    required: true,
  },
  customType: {
    type: String,
    required: true,
    enum: ['fitness', 'learning', 'productivity', 'habits', 'creative', 'custom']
  },
  TimePeriod: {
    type: String,
    required: true,
  },
  rules: {
    type: [String],
    required: true,
  },
  witnesses: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'joined', 'declined', 'left', "removed"],
      default: 'pending'
    },
    joinedAt: Date
  }],
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    default: null   
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

commitmentPodSchema.index({ admin: 1, active: 1 });
commitmentPodSchema.index({ 'witnesses.user': 1 });

module.exports = mongoose.model('CommitmentPod', commitmentPodSchema);