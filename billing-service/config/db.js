const mongoose = require('mongoose');

// Each microservice owns its own database. Both can live in the same Atlas
// cluster; DB_NAME keeps their data separate (rentbook_users / rentbook_billing).
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
  } catch (error) {
    console.error('DB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
