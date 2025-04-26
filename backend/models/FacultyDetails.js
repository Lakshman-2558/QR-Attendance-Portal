const mongoose = require('mongoose');

const FacultyDetailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  facultyId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  phone: { type: String },
  sections: { type: [String] }
});

// Used only for validation/checking if a faculty is valid
module.exports = mongoose.model('FacultyDetails', FacultyDetailsSchema, 'FacultyDetails');
