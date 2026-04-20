require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const startCronJobs = require('./src/services/cronJobs');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  startCronJobs();
  app.listen(PORT, () => {
    console.log(`🚀 CryptoArena server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();
