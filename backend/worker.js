require('dotenv').config();
const { Worker } = require('bullmq');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const IORedis = require('ioredis');
const Video = require('./models/video');
const recorderService = require('./services/recorder.service');

// Configure Cloudinary directly in the worker
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Worker connected to MongoDB!'))
  .catch(err => console.error('Worker MongoDB error:', err));

const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

const videoDir = path.join(__dirname, 'videos');
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir);
}

const worker = new Worker('video-generation', async job => {
  const { url, device, userId } = job.data;
  console.log(`\n[Job ${job.id}] Started for URL: ${url} on ${device} (User: ${userId})`);

  await job.updateProgress(10);
  let originalVideoPath = null;

  try {
    // 1. Record the video using your fixed recorder service
    originalVideoPath = await recorderService.recordWebsite({
      url,
      device,
      outputDir: videoDir,
      onProgress: progress => job.updateProgress(progress)
    });

    await job.updateProgress(85);

    // 2. Upload directly to Cloudinary (bypassing storage.service.js)
    console.log(`[Job ${job.id}] Uploading to Cloudinary...`);
    const uploadResult = await cloudinary.uploader.upload(originalVideoPath, {
      resource_type: "video",
      folder: "clip-engine" 
    });

    await job.updateProgress(95);

    // 3. Save to MongoDB
    console.log(`[Job ${job.id}] Saving to MongoDB...`);
    const newVideo = new Video({
      websiteUrl: url,
      device: device,
      jobId: job.id, 
      status: 'completed', 
      videoUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id, 
      userId: userId 
    });
    await newVideo.save();

    await job.updateProgress(100);
    return { videoUrl: uploadResult.secure_url };

  } catch (error) {
    console.error(`[Job ${job.id}] Worker Job Failed:`, error);
    throw error; 
  
  } finally {
    // Aggressive Cleanup: Sweep the entire directory
    try {
      if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir);
        for (const file of files) {
          if (file.endsWith('.webm')) {
            const filePath = path.join(videoDir, file);
            fs.unlinkSync(filePath);
            console.log(`[Job ${job.id}] Swept leftover file: ${file}`);
          }
        }
      }
    } catch (cleanupErr) {
      console.error(`[Job ${job.id}] Directory cleanup warning:`, cleanupErr.message);
    }
  }
}, { 
  connection: redisConnection,
  lockDuration: 300000 
});

worker.on('completed', job => console.log(`[Job ${job.id}] Completed successfully!`));
worker.on('failed', (job, err) => console.log(`[Job ${job.id}] Failed: ${err.message}`));
console.log('Worker is running and listening for jobs...');