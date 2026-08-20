const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  websiteUrl: {              
    type: String, 
    required: true 
  },
  device: {
    type: String,
    enum: ['mobile', 'tablet', 'desktop'],
    required: true
  },
  jobId: { 
    type: String 
  },
  status: { 
    type: String, 
    default: 'pending' 
  },
  videoUrl: { 
    type: String 
  },
  publicId: { 
    type: String 
  },
  userId: { 
    type: String,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model('Video', videoSchema);