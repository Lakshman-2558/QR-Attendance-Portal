const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { Faculty } = require("../models/faculty"); // MongoDB schema
require("dotenv").config(); // Load environment variables

const router = express.Router();
const otpStore = {}; // Store OTPs temporarily

// ✅ Nodemailer transporter (using environment variables)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Use email from .env
        pass: process.env.EMAIL_PASS  // Use app password from .env
    }
});

// 📩 **Send OTP via Email**
router.post("/forgot-password", async (req, res) => {
    try {
        const { faculty_id } = req.body;
        const faculty = await Faculty.findOne({ faculty_id });

        if (!faculty) {
            return res.status(404).json({ success: false, message: "Faculty not found!" });
        }

        // ✅ Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStore[faculty_id] = { otp, expires: Date.now() + 10 * 60 * 1000 };

        // 📩 Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: faculty.email,
            subject: "Password Reset OTP",
            text: `Your OTP is ${otp}. It is valid for 10 minutes.`
        };

        // ✅ Send OTP via email
        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP sent to ${faculty.email}: ${otp}`);

        res.json({ success: true, message: "OTP sent to your email." });
    } catch (error) {
        console.error("❌ Error sending OTP:", error);
        res.status(500).json({ success: false, message: "Failed to send OTP. Try again later." });
    }
});

// 🔒 **Reset Password**
router.post("/reset-password", async (req, res) => {
    try {
        const { faculty_id, otp, new_password } = req.body;

        if (!otpStore[faculty_id] || otpStore[faculty_id].expires < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP expired or invalid!" });
        }

        if (otpStore[faculty_id].otp !== parseInt(otp)) {
            return res.status(400).json({ success: false, message: "Incorrect OTP!" });
        }

        // 🔒 Hash new password and update database
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await Faculty.updateOne({ faculty_id }, { password: hashedPassword });

        delete otpStore[faculty_id]; // ✅ Remove OTP after use
        console.log(`✅ Password reset successful for ${faculty_id}`);

        res.json({ success: true, message: "Password reset successful." });
    } catch (error) {
        console.error("❌ Error resetting password:", error);
        res.status(500).json({ success: false, message: "Failed to reset password. Try again later." });
    }
});

module.exports = router;
