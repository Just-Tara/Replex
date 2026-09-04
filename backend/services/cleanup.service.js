const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_TEMP_DIR = path.join(os.tmpdir(), 'replex');

/**
 * Creates an isolated temp directory for a specific job.
 * @param {string|number} jobId
 * @returns {string} Absolute path to the job temp directory
 */
const createJobDir = (jobId) => {
  const jobDir = path.join(BASE_TEMP_DIR, `job-${jobId}`);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }
  return jobDir;
};

/**
 * Atomically removes the job temp directory and all its contents.
 * @param {string} jobDir
 */
const cleanupJobDir = (jobDir) => {
  if (!jobDir) return;
  try {
    if (fs.existsSync(jobDir)) {
      fs.rmSync(jobDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`[CleanupService] Failed to remove temp dir ${jobDir}:`, err.message);
  }
};

/**
 * Purges old leftover temp directories (e.g. from hard crashes) on worker startup.
 * @param {number} maxAgeMs Max age in milliseconds (default: 1 hour)
 */
const purgeOldTempDirs = (maxAgeMs = 3600000) => {
  try {
    if (!fs.existsSync(BASE_TEMP_DIR)) return;

    const entries = fs.readdirSync(BASE_TEMP_DIR);
    const now = Date.now();

    for (const entry of entries) {
      const entryPath = path.join(BASE_TEMP_DIR, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isDirectory() && (now - stat.mtimeMs > maxAgeMs)) {
        fs.rmSync(entryPath, { recursive: true, force: true });
        console.log(`[CleanupService] Purged stale temp dir: ${entry}`);
      }
    }
  } catch (err) {
    console.error('[CleanupService] Error purging old temp dirs:', err.message);
  }
};

module.exports = {
  createJobDir,
  cleanupJobDir,
  purgeOldTempDirs
};
