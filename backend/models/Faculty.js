const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  facultyId: { type: String, unique: true },
  email: String,
  password: String
});

module.exports = mongoose.model('Faculty', facultySchema);
