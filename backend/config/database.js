const mongoose = require('mongoose');

const connectDatabase = async (label = 'App') => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`${label} connected to MongoDB!`);
  } catch (err) {
    console.error(`${label} MongoDB connection error:`, err);
    throw err;
  }
};

module.exports = { connectDatabase };
