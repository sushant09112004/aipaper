import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDb = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }

        // Clean MONGO_URI - remove quotes and whitespace
        const mongoUri = process.env.MONGO_URI.trim().replace(/^["']|["']$/g, '');
        
        // Log connection attempt (without exposing password)
        const uriForLog = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
        console.log(`🔌 Attempting to connect to MongoDB: ${uriForLog}`);

        // MongoDB connection options
        const options = {
            serverSelectionTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 45000, // 45 seconds
            connectTimeoutMS: 10000, // 10 seconds
            retryWrites: true,
            w: 'majority'
        };

        await mongoose.connect(mongoUri, options);
        console.log("✅ MongoDB connected successfully");
        console.log(`📊 Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        
        // Provide helpful error messages
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
            console.error("💡 Troubleshooting tips:");
            console.error("   1. Check your internet connection");
            console.error("   2. Verify your MongoDB connection string is correct");
            console.error("   3. Check if your firewall is blocking MongoDB connections");
            console.error("   4. For MongoDB Atlas: Ensure your IP is whitelisted");
        } else if (error.message.includes('authentication')) {
            console.error("💡 Authentication failed - check your MongoDB username and password");
        } else if (error.message.includes('buffering')) {
            console.error("💡 Connection timeout - MongoDB server may be unreachable");
        }
        
        throw error;
    }
}

export default connectDb;