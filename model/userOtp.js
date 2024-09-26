const mongoose = require("mongoose");
const validator = require("validator");

const OtpSchema = new mongoose.Schema({
  otp: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Not Valid Email");
      }
    },
  },
  isOtpVerified: {
    type: Boolean,
    default: false, // Default value is false
  },
});


const userotp = new mongoose.model("userotps", OtpSchema);

module.exports = userotp;