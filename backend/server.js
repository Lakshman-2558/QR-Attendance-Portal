require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const QRCode = require("qrcode");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/qr_system")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "main.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/scanner", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "qr.html"));
});

// FacultyDetails Schema
const FacultyDetailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  faculty_id: { 
    type: String, 
    unique: true,
    required: true
  },
  email: { type: String, required: true },
  phone: String,
  department: String,
  section_subjects: [{
    section: { type: String, required: true },
    subjects: [{ type: String, required: true }]
  }]
});

const FacultyDetails = mongoose.model("FacultyDetails", FacultyDetailsSchema);

// Faculty Schema (for authentication)
const facultySchema = new mongoose.Schema({
  faculty_id: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, required: true },
});

const Faculty = mongoose.model("Faculty", facultySchema);

// OTP Schema
const otpSchema = new mongoose.Schema({
  faculty_id: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

const Otp = mongoose.model("Otp", otpSchema);

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Faculty Registration
app.post("/faculty/register", async (req, res) => {
  try {
    let { faculty_id, email, password} = req.body;

    if (!faculty_id || !email) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    faculty_id = faculty_id.trim().toLowerCase();
    email = email.trim().toLowerCase();

    const existingFaculty = await Faculty.findOne({
      $or: [{ faculty_id }, { email }],
    });

    if (existingFaculty) {
      return res.status(400).json({
        success: false,
        message: "Faculty ID or Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newFaculty = new Faculty({
      faculty_id,
      email,
      password: hashedPassword,
    });

    await newFaculty.save();

    res.status(201).json({
      success: true,
      message: "Registration successful!",
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ success: false, message: "Server error occurred" });
  }
});

// Faculty Login & QR Code Generation
app.post("/faculty/login", async (req, res) => {
  try {
    let { faculty_id, password } = req.body;
    if (!faculty_id || !password) {
      return res.status(400).json({
        success: false,
        message: "Faculty ID and password required",
      });
    }

    faculty_id = faculty_id.toLowerCase();
    const faculty = await Faculty.findOne({ faculty_id });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const qrData = JSON.stringify({
      faculty_id,
      hashed_password: faculty.password,
    });

    QRCode.toDataURL(qrData, (err, qrCodeBase64) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate QR code",
        });
      }
      res.status(200).json({
        success: true,
        message: "Login successful",
        qr_code: qrCodeBase64,
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error occurred",
    });
  }
});

// Validate Scanned QR Code
app.post("/faculty/validate_qr", async (req, res) => {
  try {
    const { scanned_qr } = req.body;
    if (!scanned_qr) {
      return res.status(400).json({
        success: false,
        message: "No QR Code scanned",
      });
    }

    let faculty_id, hashed_password;
    try {
      const parsedData = JSON.parse(scanned_qr);
      faculty_id = parsedData.faculty_id;
      hashed_password = parsedData.hashed_password;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR Data Format",
      });
    }

    const faculty = await Faculty.findOne({ faculty_id: faculty_id });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Invalid QR Code: Faculty Not Found",
      });
    }

    if (faculty.password !== hashed_password) {
      return res.status(401).json({
        success: false,
        message: "Invalid QR Code: Credentials Mismatch",
      });
    }

    res.status(200).json({
      success: true,
      message: "QR Code Valid. Login Successful!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error. Try Again.",
    });
  }
});


// Get Faculty Details
app.get("/faculty/details", async (req, res) => {
  try {
    const { faculty_id } = req.query;
    if (!faculty_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Faculty ID required" 
      });
    }

    const facultyDetails = await FacultyDetails.findOne({ faculty_id: faculty_id });

    if (!facultyDetails) {
      return res.status(404).json({ 
        success: false, 
        message: "Faculty details not found" 
      });
    }

    res.status(200).json({
      success: true,
      faculty: {
        name: facultyDetails.name,
        faculty_id: facultyDetails.faculty_id,
        section_subjects: facultyDetails.section_subjects || []
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching faculty details" 
    });
  }
});

// Admin endpoint to update faculty sections and subjects
app.post("/admin/update-faculty-subjects", async (req, res) => {
  try {
    const { faculty_id, section_subjects } = req.body;
    
    if (!faculty_id || !section_subjects || !Array.isArray(section_subjects)) {
      return res.status(400).json({
        success: false,
        message: "Invalid input data"
      });
    }

    const result = await FacultyDetails.findOneAndUpdate(
      { faculty_id },
      { $set: { section_subjects } },
      { upsert: true, new: true }
    );
    
    res.json({ 
      success: true,
      message: "Faculty subjects updated",
      data: result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error updating faculty subjects",
      error: error.message
    });
  }
});
// Enhanced faculty add endpoint with better validation
app.post("/faculty/add", async (req, res) => {
  try {
      const { name, faculty_id, email, department, section_subjects } = req.body;

      // Validate required fields
      if (!name || !faculty_id || !email) {
          return res.status(400).json({
              success: false,
              message: "Name, faculty ID and email are required"
          });
      }

      // Check if faculty ID already exists
      const existingById = await FacultyDetails.findOne({ faculty_id });
      if (existingById) {
          return res.status(400).json({
              success: false,
              message: "Faculty ID already exists",
              existingData: {
                  name: existingById.name,
                  faculty_id: existingById.faculty_id,
                  email: existingById.email,
                  department: existingById.department,
                  section_subjects: existingById.section_subjects
              }
          });
      }

      // Check if email already exists
      const existingByEmail = await FacultyDetails.findOne({ email });
      if (existingByEmail) {
          return res.status(400).json({
              success: false,
              message: "Email already exists",
              existingData: {
                  name: existingByEmail.name,
                  faculty_id: existingByEmail.faculty_id,
                  email: existingByEmail.email,
                  department: existingByEmail.department,
                  section_subjects: existingByEmail.section_subjects
              }
          });
      }

      // Create new faculty
      const newFaculty = new FacultyDetails({
          name,
          faculty_id,
          email,
          department: department || "",
          section_subjects: section_subjects || []
      });

      await newFaculty.save();

      res.json({
          success: true,
          message: "Faculty added successfully",
          faculty: newFaculty
      });
  } catch (error) {
      res.status(500).json({
          success: false,
          message: "Error adding faculty",
          error: error.message
      });
  }
});

// ✅ Send OTP for Password Reset
app.post("/faculty/send-otp", async (req, res) => {
  try {
      let { faculty_id } = req.body;
      faculty_id = faculty_id.toLowerCase();

      const faculty = await Faculty.findOne({ faculty_id });
      if (!faculty) {
          return res.status(404).json({ 
              success: false, 
              message: "Faculty ID not found" 
          });
      }

      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

      // Delete any existing OTP for this faculty
      await Otp.deleteMany({ faculty_id });

      // Save new OTP
      const newOtp = new Otp({
          faculty_id,
          otp,
          expiresAt
      });
      await newOtp.save();

      // Send email
      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: faculty.email,
          subject: "Faculty Password Reset OTP",
          text: `Your OTP for password reset is: ${otp}. It is valid for 5 minutes.`,
      };

      await transporter.sendMail(mailOptions);
      
      res.json({ 
          success: true, 
          message: "OTP sent to your email" 
      });
  } catch (error) {
      console.error("OTP Send Error:", error);
      res.status(500).json({ 
          success: false, 
          message: "Server error occurred" 
      });
  }
});

// Verify OTP
app.post("/faculty/verify-otp", async (req, res) => {
  try {
      let { faculty_id, otp } = req.body;
      faculty_id = faculty_id.toLowerCase();
      otp = otp.trim();

      // Find the OTP record
      const otpRecord = await Otp.findOne({ faculty_id });
      if (!otpRecord) {
          return res.status(400).json({ 
              success: false, 
              message: "OTP not found or expired" 
          });
      }

      // Check if OTP matches and is not expired
      if (otpRecord.otp !== otp || new Date() > otpRecord.expiresAt) {
          return res.status(400).json({ 
              success: false, 
              message: "Invalid or expired OTP" 
          });
      }

      res.json({ 
          success: true, 
          message: "OTP Verified!" 
      });
  } catch (error) {
      console.error("OTP Verify Error:", error);
      res.status(500).json({ 
          success: false, 
          message: "Server error occurred" 
      });
  }
});

// Reset Password
app.post("/faculty/reset-password", async (req, res) => {
  try {
      let { faculty_id, new_password, otp } = req.body;
      
      // Validate input
      if (!faculty_id || !new_password || !otp) {
          return res.status(400).json({ 
              success: false, 
              message: "All fields are required" 
          });
      }

      // Verify OTP first
      const otpRecord = await Otp.findOne({ faculty_id });
      if (!otpRecord || otpRecord.otp !== otp || new Date() > otpRecord.expiresAt) {
          return res.status(400).json({ 
              success: false, 
              message: "Invalid or expired OTP" 
          });
      }

      // Find faculty and update password
      const faculty = await Faculty.findOne({ faculty_id });
      if (!faculty) {
          return res.status(404).json({ 
              success: false, 
              message: "Faculty not found" 
          });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      faculty.password = hashedPassword;
      await faculty.save();

      // Delete the used OTP
      await Otp.deleteOne({ _id: otpRecord._id });

      res.json({ 
          success: true, 
          message: "Password reset successful!" 
      });
  } catch (error) {
      console.error("Password Reset Error:", error);
      res.status(500).json({ 
          success: false, 
          message: "Server error occurred" 
      });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
