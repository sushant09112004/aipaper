import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDb from './db/connectDb.js';
import userRoutes from './routes/userRoutes.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config();

const app = express();
// Clean PORT value - remove any semicolons or whitespace
const PORT = parseInt((process.env.PORT || '5000').replace(/[;\s]/g, ''), 10) || 5000;

app.use(cookieParser());

const allowedOrigins = [
  "https://hack-odhisha-team-fb.vercel.app", 
  "http://localhost:3000",
  "http://localhost:8080"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    port: PORT,
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// Connect to MongoDB (non-blocking - server will start even if MongoDB fails initially)
connectDb().catch((error) => {
  console.error('⚠️  MongoDB connection failed, but server will continue:', error.message);
  console.log('⚠️  Some features may not work until MongoDB is connected');
});

// Start server immediately
const server = app.listen(PORT, 'localhost', () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`✅ Server is also accessible on http://127.0.0.1:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check and display configuration status
  const mongoUri = process.env.MONGO_URI;
  const jwtSecret = process.env.JWT_SECRET;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;
  
  console.log(`\n📋 Configuration Status:`);
  console.log(`   MongoDB URI: ${mongoUri ? `✅ Configured (${mongoUri.substring(0, 20)}...)` : '❌ NOT CONFIGURED'}`);
  console.log(`   JWT Secret: ${jwtSecret ? '✅ Configured' : '❌ NOT CONFIGURED'}`);
  console.log(`   Email User: ${emailUser ? '✅ Configured' : '❌ NOT CONFIGURED'}`);
  console.log(`   Email Password: ${emailPass ? '✅ Configured' : '❌ NOT CONFIGURED'}`);
  
  console.log(`\n📡 Test endpoints:`);
  console.log(`   - http://localhost:${PORT}/`);
  console.log(`   - http://localhost:${PORT}/health`);
  console.log(`   - http://localhost:${PORT}/api/users/register`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error(`   Try changing PORT in your .env file or stop the process using port ${PORT}`);
    console.error(`   Run: netstat -ano | findstr :${PORT} to find the process`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});
