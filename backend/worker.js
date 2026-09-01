require('dotenv').config();
const { Worker } = require('bullmq');
const { connectDatabase } = require('./config/database');
const { createRedisConnection } = require('./config/redis');
const cleanupService = require('./services/cleanup.service');
const recorderService = require('./services/recorder.service');
const storageService = require('./services/storage.service');
const Video = require('./models/video');

// Connect Worker to MongoDB
connectDatabase('Worker').catch(err => {
  console.error('Worker MongoDB connection error:', err);
});

// Purge any stale temp directories from previous runs/crashes
cleanupService.purgeOldTempDirs();

const redisConnection = createRedisConnection();

const worker = new Worker('video-generation', async job => {
  const { url, device = 'mobile', userId } = job.data; // Extract userId
  console.log(`\n[Job ${job.id}] Started for URL: ${url} on ${device} (User: ${userId})`);

  const jobDir = cleanupService.createJobDir(job.id);
  let originalVideoPath = null;

  try {
    await job.updateProgress(10);

    // 1. Record website to isolated temp directory
    originalVideoPath = await recorderService.recordWebsite({
      url,
      device,
      outputDir: jobDir,
      onProgress: progress => job.updateProgress(progress)
    });

    await job.updateProgress(85);

    // Stream upload directly to Cloudinary and Save to DB
    console.log(`[Job ${job.id}] Streaming video upload to Cloudinary...`);
    const uploadResult = await storageService.uploadVideoStream(originalVideoPath, {
      folder: 'clip-engine'
    });

    await job.updateProgress(95);

    console.log(`[Job ${job.id}] Saving to MongoDB...`);
    const newVideo = new Video({
      websiteUrl: url,
      device: device,
      jobId: job.id,           // Saving jobId to match the schema
      status: 'completed',     // Setting status to match the schema
      videoUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id, // Save publicId for deletion later
      userId: userId           // Tie this video to the user
    });
    await newVideo.save();

    await job.updateProgress(100);
    return { videoUrl: uploadResult.secure_url };

  } catch (error) {
    console.error(`[Job ${job.id}] Worker Job Failed:`, error);
    throw error; // Rethrow so BullMQ knows it failed
  } finally {
    // deletes the temp directory even if Playwright crashed
    cleanupService.cleanupJobDir(jobDir);
    console.log(`[Job ${job.id}] Cleaned up temp directory.`);
  }
}, {
  connection: redisConnection,
  lockDuration: 300000
});

worker.on('completed', job => console.log(`[Job ${job.id}] Completed successfully!`));
worker.on('failed', (job, err) => console.log(`[Job ${job.id}] Failed: ${err.message}`));
console.log('Worker is running and listening for jobs...');