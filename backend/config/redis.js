const IORedis = require('ioredis');

const createRedisConnection = () => {
  return new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
  });
};

module.exports = { createRedisConnection };
