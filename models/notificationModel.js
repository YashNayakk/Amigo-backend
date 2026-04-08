const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'pod_invite',
      'pod_joined',
      'pod_declined',
      'pod_left',
      'pod_deleted',   
      'pod_removed',  
      'card_shared',
    ],
    required: true
  },
  pod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommitmentPod'
  },
  read: {
    type: Boolean,
    default: false
  },
  message: String
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);