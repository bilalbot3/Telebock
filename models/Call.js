const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duration: { type: Number, required: true },
  mediaUrl: { type: String },
  callType: { type: String, enum: ['voice', 'video'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Call', CallSchema);
