const mongoose = require("mongoose");
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema(
    {
      person_name: {
        type: String,
        required: [true, "Name is required"],
      },
      email: {
        type: String,
        unique: true,
        required: [true, "Email is required"],
      },
      password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters"],
      },
     
    },
    { timestamps: true } // corrected here
  );

// userSchema
//   .virtual("confirmPassword")
//   .get(() => this._confirmPassword)
//   .set((value) => (this._confirmPassword = value));



userSchema.pre('save', function(next) {
  bcrypt.hash(this.password, 10)
      .then(hash => {
          this.password = hash;
          next();
      })
      .catch(error => next(error)); // Pass the error to the next middleware
});

// userSchema.plugin(uniqueValidator);
const userdb = new mongoose.model("users", userSchema);
module.exports = userdb;
