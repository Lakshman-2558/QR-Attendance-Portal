const mongoose = require("mongoose");

const otpRequestResetSchema = new mongoose.Schema({
    faculty_id: { type: String, required: true },
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true }
});

module.exports = mongoose.model("OtpRequestReset", otpRequestResetSchema);
