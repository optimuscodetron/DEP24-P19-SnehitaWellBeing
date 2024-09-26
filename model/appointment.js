const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  fullName: {
    type: String,
  },
  mobileNumber: {
    type: Number,
    required: true
  },
  emailAddress: {
    type: String,
    // required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  counselorName:{
    type: String,
    required: true,
  },
  appointmentSlot: {
    type: String,
    required: true
  },
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'users'

  }
}, { timestamps: true }); // Corrected here

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
