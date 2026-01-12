import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();


// Create nodemailer transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter configuration (non-blocking)
transporter.verify(function (error, success) {
  if (error) {
    console.error('⚠️  Email transporter configuration error:', error.message);
    if (error.code === 'ENOTFOUND' || error.code === 'EDNS') {
      console.error('💡 DNS/Network issue - Check your internet connection');
    } else if (error.code === 'EAUTH') {
      console.error('💡 Authentication failed - Check EMAIL_USER and EMAIL_PASSWORD in .env');
    }
    console.log('⚠️  Email features will not work until this is resolved');
  } else {
    console.log('✅ Email transporter is ready to send emails');
  }
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registerUser = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      password,
    } = req.body;

    if (
      !firstname ||
      !lastname ||
      !email ||
      !password
    ) {
      return res.status(400).json({ success: false, message: "Please fill in all fields" });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured in environment variables");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstname,
      lastname,
      email,
      password: hashedPassword,
    });

    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 28 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ success: true, user: { name: user.firstname }, token });
  } catch (error) {
    console.error("Registration error:", error);
    
    // Handle duplicate email error
    if (error.code === 11000 || error.message.includes("duplicate")) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }
    
    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ success: false, message: error.message || "Registration failed" });
  }
};


export const sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Send email OTP
    try {
      // Check if email credentials are configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('Email credentials not configured');
        return res.status(500).json({ 
          success: false, 
          message: 'Email service not configured. Please contact administrator.' 
        });
      }

      const mailOptions = {
        from: `"AuthenTech" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Your Login OTP - AuthenTech',
        text: `Your OTP code is ${otpCode}. This code will expire in 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Your Login OTP</h2>
            <p>Hello ${user.firstname || 'User'},</p>
            <p>Your OTP code for login is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otpCode}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">This is an automated message from AuthenTech - Team Firewall Breakers</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent successfully:', info.messageId);
      console.log('📧 Email sent to:', user.email);

      // Update user with OTP details
      user.otp = {
        code: otpCode,
        expiresAt,
        sentTo: ['email']
      };
      await user.save();

      res.json({
        success: true,
        message: "OTP sent successfully to your email",
        otpSentTo: ['email']
      });

    } catch (emailError) {
      console.error('❌ Error sending email OTP:', emailError);
      console.error('Error details:', {
        code: emailError.code,
        command: emailError.command,
        response: emailError.response
      });
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to send OTP email';
      if (emailError.code === 'EAUTH') {
        errorMessage = 'Email authentication failed. Please check email credentials in .env file.';
      } else if (emailError.code === 'ECONNECTION') {
        errorMessage = 'Could not connect to email server. Please check your internet connection.';
      } else if (emailError.response) {
        errorMessage = `Email server error: ${emailError.response}`;
      }
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if OTP exists, matches, and isn't expired
    if (!user.otp ||
      user.otp.code !== otp ||
      new Date() > user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    // Clear the OTP after successful verification
    user.otp = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '28d'
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 28 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        name: user.firstname || user.email,
        email: user.email
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
};



export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      success: true,
      data: {
        name: user.firstname || user.email,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in getUser:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    const userData = users.map(user => ({
      id: user._id,
      name: user.firstname || user.email,
      email: user.email,
    }));

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      data: {
        name: user.firstname || user.email,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateUserResults = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, institution } = req.body;
    if (!name || !institution) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { lastResults: { name, institution, date: new Date() } } },
      { new: true }
    );
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const fetchResults = async (req, res) => {
  try {
    // user id comes from auth middleware (JWT decoded)
    const user = await User.findById(req.user.id).select("lastResults");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      data: user.lastResults, // only send the array
    });
  } catch (error) {
    console.error("Error in fetchResults:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};