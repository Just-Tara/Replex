require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Queue } = require('bullmq');
const { connectDatabase } = require('./config/database');
const { createRedisConnection } = require('./config/redis');
const storageService = require('./services/storage.service');
const Video = require('./models/video');

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDatabase('Server').catch(err => {
  console.error('Server failed to connect to database:', err);
});

const redisConnection = createRedisConnection();
const videoQueue = new Queue('video-generation', { connection: redisConnection });

app.post('/generate-video', async (req, res) => {
  const { url, device = 'mobile' } = req.body;
  const userId = req.headers['x-user-id'];

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const job = await videoQueue.add('record-site', { url, device, userId });
  res.json({ message: 'Video generation started', jobId: job.id });
});

app.get('/job-status/:id', async (req, res) => {
  const { id } = req.params;
  let job = await videoQueue.getJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();

  if (state === 'completed' && !job.returnvalue) {
    job = await videoQueue.getJob(id);
  }

  const progress = job.progress;
  const result = job.returnvalue;

  res.json({ id: job.id, state, progress, result });
});

app.get('/api/history', async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.json([]);
  }

  try {
    const videos = await Video.find({ userId }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    console.error('Error fetching video history:', err);
    res.status(500).json({ error: 'Failed to fetch video history' });
  }
});

app.delete('/api/history/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.publicId) {
      await storageService.deleteVideoAsset(video.publicId).catch(err => {
        console.error('Cloudinary delete failed:', err.message);
      });
    }

    await Video.findByIdAndDelete(id);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting video:', err);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

app.listen(PORT, () => {
  console.log(`Express API is running on port ${PORT}`);
});