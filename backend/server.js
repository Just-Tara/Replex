require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { Queue } = require('bullmq');
const mongoose = require('mongoose');
const Video = require('./models/video');
const cloudinary = require('cloudinary').v2;
const PORT = process.env.PORT || 5000;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
app.use(cors());
app.use(express.json());


const videoDir = path.join(__dirname, 'videos');
if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir);
}
app.use('/videos', express.static(videoDir));

mongoose.connect(process.env.MONGO_URI )
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const redisConnection = { host: '127.0.0.1', port: 6379 };
const videoQueue = new Queue('video-generation', { connection: redisConnection });

app.post('/generate-video', async (req, res) => {
    const { url, device = 'mobile' } = req.body; 

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    const job = await videoQueue.add('record-site', { url, device });
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
    try {
        const videos = await Video.find().sort({ createdAt: -1 });
        res.json(videos);
    } catch (err) {
        console.error('Error fetching video history:', err);
        res.status(500).json({ error: 'Failed to fetch video history' });
    }   
})
app.delete('/api/history/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const video = await Video.findById(id);
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Remove from Cloudinary first (if we have a public_id to target)
        if (video.publicId) {
            await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' })
                .catch(err => console.error('Cloudinary delete failed:', err));
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