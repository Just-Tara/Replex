const fs = require('fs');
const cloudinary = require('../config/cloudinary');

/**
 * Uploads a local video file to Cloudinary via a readable stream with retry handling.
 * @param {string} filePath Path to the local video file
 * @param {object} options Cloudinary upload options
 * @param {number} retries Number of retry attempts on failure
 * @param {number} delayMs Initial backoff delay in ms
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadVideoStream = async (filePath, options = {}, retries = 2, delayMs = 1500) => {
  const uploadOptions = {
    resource_type: 'video',
    folder: 'clip-engine',
    ...options
  };

  const attemptUpload = () => {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filePath);

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      readStream.on('error', (streamErr) => reject(streamErr));
      readStream.pipe(uploadStream);
    });
  };

  try {
    return await attemptUpload();
  } catch (error) {
    if (retries > 0) {
      console.warn(`[StorageService] Upload failed (${error.message}). Retrying in ${delayMs}ms... (${retries} attempts left)`);
      await new Promise((res) => setTimeout(res, delayMs));
      return uploadVideoStream(filePath, options, retries - 1, delayMs * 2);
    }
    throw error;
  }
};

/**
 * Deletes a video asset from Cloudinary by public ID.
 * @param {string} publicId
 */
const deleteVideoAsset = async (publicId) => {
  if (!publicId) return;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
  } catch (err) {
    console.error(`[StorageService] Failed to delete Cloudinary asset ${publicId}:`, err.message);
    throw err;
  }
};

module.exports = {
  uploadVideoStream,
  deleteVideoAsset
};
