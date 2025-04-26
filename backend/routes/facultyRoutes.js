const express = require("express");
const Faculty = require("../models/Faculty");
const FacultyDetails = require("../routes/FacultyDetails"); // Import FacultyDetails model
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const router = express.Router();

// 🔹 Faculty Registration
router.post("/register", async (req, res) => {
    const { faculty_id, password, email } = req.body;

    if (!faculty_id || !password || !email) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        // Check if Faculty ID exists in the FacultyDetails collection
        const facultyDetails = await FacultyDetails.findOne({ faculty_id });
        if (!facultyDetails) {
            return res.status(400).json({ success: false, message: "Faculty ID not found in FacultyDetails" });
        }

        // Check if Faculty ID or Email already exists in Faculty collection
        const existingFaculty = await Faculty.findOne({ faculty_id });
        if (existingFaculty) {
            return res.status(400).json({ success: false, message: "Faculty ID already registered" });
        }

        const emailExists = await Faculty.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        // 🔹 Hash Password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        const newFaculty = new Faculty({ faculty_id, password: hashedPassword, email });
        await newFaculty.save();

        res.status(201).json({ success: true, message: "Faculty registered successfully!" });
    } catch (error) {
        console.error("❌ Registration Error:", error);
        res.status(500).json({ success: false, message: "Error registering faculty" });
    }
});

// 🔹 Faculty Login
router.post("/login", async (req, res) => {
    const { faculty_id, password } = req.body;

    if (!faculty_id || !password) {
        return res.status(400).json({ success: false, message: "Faculty ID and password required" });
    }

    try {
        // Check if Faculty ID exists in the FacultyDetails collection
        const facultyDetails = await FacultyDetails.findOne({ faculty_id });
        if (!facultyDetails) {
            return res.status(404).json({ success: false, message: "Faculty ID not found in FacultyDetails" });
        }

        // Check if Faculty exists in the Faculty collection
        const faculty = await Faculty.findOne({ faculty_id });
        if (!faculty) {
            return res.status(404).json({ success: false, message: "Faculty not found" });
        }

        // 🔹 Compare entered password with stored hashed password
        const isMatch = await bcrypt.compare(password, faculty.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        // 🔹 Generate JWT Token for session management (Secret Key from .env)
        const token = jwt.sign({ faculty_id: faculty.faculty_id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ success: true, message: "Login successful", token });
    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ success: false, message: "Error logging in" });
    }
});

module.exports = router;
