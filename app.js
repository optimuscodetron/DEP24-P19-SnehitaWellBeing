require("dotenv").config();
const express = require("express");
const fs = require("fs");
const nodemailer = require("nodemailer");
const app = express();
const cors = require("cors");
require("./db/conn");
const bcrypt = require("bcrypt");
const PORT = process.env.PORT || 8000;
const session = require("express-session");
const userdb = require("./model/userSchema");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const BASE_URL = process.env.BASE_URL;
app.use(cors({ credentials: true, origin: BASE_URL }));
app.use(express.json());
app.use(cookieParser());

const Appointment = require("./model/appointment");
const userotp = require("./model/userOtp");
const { authenticate } = require("./db/jwt.config");

//home video
const videoFileMap = {
  'cdn': 'videos/campusVideo.mp4',
};
//

app.use(
  cors({
    origin: BASE_URL,
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL,
    pass: process.env.PASSWORD,
  },
});
app.get("/login/success", async (req, res) => {
  const token = req.cookies.usertoken;
  console.log("fff");

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, "abcdef");
    const user = await userdb.findById(decoded.id);

    if (!user) {
      throw new Error();
    }

    res
      .status(200)
      .json({ message: "User logged in successfully", user: user });
  } catch (error) {
    res.status(401).json({ message: "Not authorized" });
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("usertoken");
  res.redirect(BASE_URL);
});


const createAppointment = async (req, res) => {
  try {
    const token = req.cookies.usertoken;
    console.log("Token received:", token);
    const decoded = jwt.verify(token, "abcdef");
    const userId = decoded.id;
    const {
      fullName,
      mobileNumber,
      emailAddress,
      appointmentDate,
      counselorName,
      appointmentSlot,
    } = req.body;
    const appointment = new Appointment({
      fullName,
      mobileNumber,
      emailAddress,
      appointmentDate,
      counselorName,
      appointmentSlot,
      userId,
    });
    await appointment.save();

    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const getAppointments = async (req, res) => {
  try {
    const token = req.cookies.usertoken;
    console.log("Token received:", token);
    const decoded = jwt.verify(token, "abcdef");
    const userId = decoded.id;
    console.log(userId);
    const appointments = await Appointment.find({ userId: userId });
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
const sendEmail = async (req, res) => {
  const formData = req.body;

  // Map counselor names to their email addresses
  const counselorEmails = {
    "Deepak Phogat": " counsellor1@iitrpr.ac.in",
    "Gargi Tiwari": " counsellor2@iitrpr.ac.in",
  };

  // Get the email address of the chosen counselor
  const counselorEmail = counselorEmails[formData.counselorName];

  // Construct a formatted string
  // let formattedText = '';
  // for (let key in formData) {
  //     formattedText += `<b>${key}:</b>&nbsp;&nbsp;${formData[key]}<br><br>`;
  // }
  let formattedText = `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h1 style="background-color: #f2f2f2; padding: 10px; text-align: center;">Appointment Confirmation</h1>
    <p>Hello ${formData.counselorName},</p>
    <p>The following individual has scheduled an appointment with you. Please find the details below:</p>
    <ul>
`;

  for (let key in formData) {
    if (key !== "counselorName") {
      formattedText += `<li><strong>${key}:</strong> ${formData[key]}</li>`;
    }
  }

  formattedText += `
    </ul>
    <p>Regards,</p>
    <p><strong>Team Snehita Well-Being</strong></p>
  </div>
`;

  // Rest of your sendMail function...

  let info = await transporter.sendMail({
    from: '"Piyush" pushkr.1090@gmail.com', // sender address
    to: counselorEmail, // send to the chosen counselor
    subject: "New Counselling Appointment", // Subject line
    html: formattedText, // formatted text body
  });
  res.json({ message: "Email sent" });
};

const getBookedSlots = async (req, res) => {
  try {
    const { counselorName, appointmentDate } = req.query;
    const appointments = await Appointment.find({
      counselorName: counselorName,
      appointmentDate: new Date(appointmentDate),
    });
    const bookedSlots = appointments.map(
      (appointment) => appointment.appointmentSlot
    );
    res.json(bookedSlots);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
const register2 = async (req, res) => {
  const { person_name, otp, email, password } = req.body;

  try {
    const otpEmailed = await userotp.findOne({ email: email });
    if (otpEmailed.otp === otp) {
      const register = new userdb({
        person_name,
        email,
        password,
      });
      otpEmailed.isOtpVerified = false;
      await otpEmailed.save();
      await register.save();

      const userToken = jwt.sign(
        {
          id: register._id,
        },
        "abcdef"
      );

      res
        .cookie("usertoken", userToken, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
        })
        .status(200)
        .json({ message: "Success!", user: register });
    } else {
      res.status(400).json({ error: "Invalid Otp" });
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "An error occurred, please try again" });
  }
};

const login = async (req, res) => {

  const { email, password } = req.body;

  try {
    const user = await userdb.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    console.log(password);
    const correctPassword = await bcrypt.compare(password, user.password);
    if (!correctPassword) {
      console.log("inccorect password");
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const userToken = jwt.sign(
      {
        id: user._id,
      },
      "abcdef"
    );

    res
      .cookie("usertoken", userToken, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      })
      .status(200)
      .json({ message: "Success!", user: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred, please try again" });
  }
};

const sendotp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Please Enter Your Email" });
  }

  const user = await userdb.findOne({ email: email });
  if (user) {
    console.log("This user already exists");
    return res.status(400).json({ error: "This user already exists" });
  }

  try {
    const OTP = Math.floor(100000 + Math.random() * 900000); // four digit random number gener

    const existEmail = await userotp.findOne({ email: email });

    if (existEmail) {
      const updateData = await userotp.findByIdAndUpdate(
        { _id: existEmail._id },
        {
          otp: OTP,
        },
        { new: true }
      );
      await updateData.save();
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Sending email for otp validation",
        text: `OTP:- ${OTP}`,
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          res.status(400).json({ error: "Email Not Sent" });
        } else {
          console.log("otp sent");
          res.status(200).json({ message: "Email Sent Successfully" });
        }
      });
    } else {
      console.log(email);
      const saveOtpData = new userotp({
        email,
        otp: OTP,
      });
      await saveOtpData.save();
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Sending email for otp validation",
        text: `OTP for Registration:- ${OTP}`,
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          res.status(400).json({ error: "Email Not Sent" });
        } else {
          console.log("otp sent");
          res.status(200).json({ message: "Email Sent Successfully" });
        }
      });
    }
  } catch (error) {
    res.status(400).json({ error: "Invalid Details", error });
  }
};

const sendotpforforetpassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Please Enter Your  Registered Email" });
  }

  try {
    const presuer = await userdb.findOne({ email: email });

    if (presuer) {
      const OTP = Math.floor(100000 + Math.random() * 900000);

      const existEmail = await userotp.findOne({ email: email });

      if (existEmail) {
        const updateData = await userotp.findByIdAndUpdate(
          { _id: existEmail._id },
          {
            otp: OTP,
          },
          { new: true }
        );
        await updateData.save();

        const mailOptions = {
          from: process.env.EMAIL,
          to: email,
          subject: "Sending Email For Otp Validation",
          text: `OTP for forgot password:- ${OTP}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log("error", error);
            res.status(400).json({ error: "email not send" });
          } else {
            console.log("Email sent", info.response);
            res.status(200).json({ message: "Email sent Successfully" });
          }
        });
      } else {
        const saveOtpData = new userotp({
          email,
          otp: OTP,
        });

        await saveOtpData.save();
        const mailOptions = {
          from: process.env.EMAIL,
          to: email,
          subject: "Sending Email For Otp Validation",
          text: `OTP:- ${OTP}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log("error", error);
            res.status(400).json({ error: "email not send" });
          } else {
            console.log("Email sent", info.response);
            res.status(200).json({ message: "Email sent Successfully" });
          }
        });
      }
    } else {
      res.status(400).json({ error: "This User Not Exist In our Database" });
    }
  } catch (error) {
    res.status(400).json({ error: "Invalid Details", error });
  }
};
const otpverify = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const otpEmailed = await userotp.findOne({ email: email });
    console.log("1", otpEmailed);
    if (otpEmailed && otpEmailed.otp === otp) {
      otpEmailed.isOtpVerified = true;
      await otpEmailed.save();
      console.log("2", otpEmailed);
      res.status(200).json({
        message: "OTP verified successfully",
        email: email,
        otp: otp,
      });
    } else {
      res.status(400).json({
        message: "Incorrect OTP",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: "Error verifying OTP",
      error: error,
    });
  }
};

const changeinfo = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userdb.findOne({ email: email });
    const otpEmailed = await userotp.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if OTP is verified
    if (!otpEmailed.isOtpVerified) {
      console.log("OTP not verified");
      return res.status(400).json({ message: "OTP not verified" });
    }

    user.password = password; // set the new password
    otpEmailed.isOtpVerified = false;
    await otpEmailed.save();
    await user.save(); // this will hash the password and save the user

    res.status(200).json({
      message: "Password reset successfully",
      myuser: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error: error });
  }
};

//home video

app.get("/home/video", (req, res) => {
  console.log("hello")
  // const fileName = req.params.filename;
  const filePath = "./videos/campusVideo.mp4";
  // if (!filePath) {
  //   return res.status(404).send("File not found");
  // }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

//

app.post("/create", authenticate, createAppointment);
app.get("/data", authenticate, getAppointments);
app.post("/send-email", authenticate, sendEmail);
app.get("/bookedSlots", authenticate, getBookedSlots);
app.post("/user/register", register2);
app.post("/user/login", login);
app.post("/user/sendotp", sendotp);

app.post("/user/sendotppassword", sendotpforforetpassword);
app.post("/user/otpverify", otpverify);
app.post("/user/newpassword", changeinfo);
// app.get("/home/video", streamvideo);

app.listen(PORT, () => {
  console.log(`server start at port no ${PORT}`);
});
