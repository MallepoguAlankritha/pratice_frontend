const express = require("express");
const mongoose = require("mongoose");
const Razorpay=require('razorpay')
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const multer = require("multer");
const nodemailer = require('nodemailer');
const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  "mongodb+srv://Avverma:Avverma95766@avverma.2g4orpk.mongodb.net/Hotel";
const AWS_BUCKET_NAME = "classroom-training-bucket";
const AWS_ACCESS_KEY_ID = "AKIAY3L35MCRZNIRGT6N";
const AWS_SECRET_ACCESS_KEY = "9f+YFBVcSjZWM6DG9R4TUN8k8TGe4X+lXmO4jPiU";
const AWS_REGION = "ap-south-1"; // Update this to the appropriate region for your S3 bucket
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: AWS_BUCKET_NAME,
    acl: "public-read",
    key: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images are allowed."));
    }
  },
}).array("images", 10);

const transporter = nodemailer.createTransport({
  service: 'your_email_provider',
  auth: {
    user: 'your_email',
    pass: 'your_password'
  }
});
function generateOTP() {
  const length = 6;
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}
async function sendOTP(email) {
  const otp = generateOTP();
  const mailOptions = {
    from: 'your_email',
    to: email,
    subject: 'OTP Verification',
    text: `Your OTP: ${otp}`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', info.response);
    return otp;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
}
sendOTP('recipient@example.com')
  .then(otp => {
    console.log('Generated OTP:', otp);
  })
  .catch(error => {
    console.error('Error generating/sending OTP:', error);
  });

// ===============================================user Schema========================================================//
const UserSchema = new mongoose.Schema({
  name: { type: String, required: false },
  gender : { type: String, required: false },
  address: { type: String, required: false },
  email: { type: String, required: false, unique: true },
  mobile: { type: String, required: false },
  password: { type: String, required: false },
  otp: { type: String, required: false },
  images: { type: [String], required: false },
});

const signUp = mongoose.model("user", UserSchema);
//========================================//POST USER //====================================================================
app.post("/signup", upload, async (req, res) => {
  const { name, gender, address, email, mobile, password } = req.body;
  const images = req.files.map((file) => file.location);
  const user = new signUp({ name, gender, address, email, mobile, password, images });
  await user.save();
  io.emit("recordAdded", user);
  res.json(user);
});
//========================================GET USER DETAILS===============================================================//
app.get("/get/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await signUp.findById(userId);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

//=============================================SIGN IN===============================================================//
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user in the database
    const user = await signUp.findOne({ email });

    // Check if user exists and compare passwords
    if (user && user.password && user.otp === password) {
      res.json({ message: "Sign-in successful", userId: user._id });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/generate-otp', async (req, res) => {
  try {
    const otp = generateOTP(); 
    const email = 'recipient@example.com'; 

    const mailOptions = {
      from: 'your_email',
      to: email,
      subject: 'OTP Verification',
      text: `Your OTP: ${otp}`
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', email);
    res.send('OTP sent successfully!');
  } catch (error) {
    console.error('Error sending OTP email:', error);
    res.status(500).send('Failed to send OTP email.');
  }
});

//========================================update user===============================================//
// app.put('/user/:id', upload,async(req, res) => {
//   const { id } = req.params;
//   const { name, address,gender, email, mobile, password } = req.body;
//   const images = req.files.map(file => file.location);

//  const user= await signUp.findByIdAndUpdate(id,{name,address,gender,email,mobile,password,images,},{ new: true })
//     .then((user) => {
//       if (user) {
//         res.json(user);
//       } else {
//         res.status(404).json({ message: 'User not found' });
//       }
//     })
//     .catch((error) => {
//       res.status(500).json({ message: 'Internal server error', error });
//     });
// });
app.put('/user/:id', upload, async (req, res) => {
  const { id } = req.params;
  const { name, address, gender, email, mobile, password } = req.body;
  let images = [];

  if (req.files.length > 0) {
    images = req.files.map(file => file.location);
  }

  const user = await signUp.findByIdAndUpdate(
    id,
    { name, address, gender, email, mobile, password, images },
    { new: true }
  )
    .then((user) => {
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    })
    .catch((error) => {
      res.status(500).json({ message: 'Internal server error', error });
    });
});

//=======================================welcome schema=================================================//
const welcomeSchema = new mongoose.Schema({
  images: { type: [String], required: false },
});
const welcome = mongoose.model("welcome", welcomeSchema);
//========================================post welocome================================================//
app.post("/welcome", upload, async (req, res) => {
  const images = req.files.map((file) => file.location);
  const user = new welcome({ images });
  await user.save();
  io.emit("recordAdded", user);
  res.json(user);
});
//=======================================get welcome=====================================================//
app.get("/welcome/get", async (req, res) => {
  const user = await welcome.find();
  res.json(user);
});
//===============================================================================================================

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "approved", "rejected"],
  },
  complaintDescription: { type: String, required: true },
});

const complaint = mongoose.model("complaint", complaintSchema);

app.post("/complaint/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { complaintDescription } = req.body;
    if (id != undefined) {
      const existingComplaint = await complaint.findOne({ id });
      if (existingComplaint) {
        existingComplaint.complaintDescription = complaintDescription;
        await existingComplaint.save();
        return res.status(200).json({
          status: 200,
          success: true,
          message: "complaint successfully updated ",
        });
      } else {
        const newComplaint = await complaint.create({
          userId: id,
          complaintDescription: complaintDescription,
          status: "pending",
        });
        return res.status(200).json({
          status: 200,
          success: true,
          message: "complaint created ",
        });
      }
    } else {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "please provide id in correct way ",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: " something went wrong",
      error: error.message,
    });
  }
});

app.patch("/updateProfile", async (req, res) => {
  try {
    const { id } = req.query;
    const { name, address, email, mobile, password, newPassword } = req.body;

    const existingUser = await signUp.findById(id);
    if (existingUser) {
      if (existingUser.password === password) {
        const updatedUser = await signUp.findByIdAndUpdate(id, {
          name,
          email,
          mobile,
          password: newPassword,
          address,
        });
        return res.status(200).json({
          status: 200,
          success: true,
          message: "profile updated successfully",
        });
      } else {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "password does not match",
        });
      }
    } else {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "this user does not exist ",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: " something went wrong",
      error: error.message,
    });
  }
});

app.patch("/approveComplaint/", async (req, res) => {
  try {
    const { id } = req.query;
    const { status } = req.body;
    if (id != undefined) {
      const existingUser = await complaint.findByIdAndUpdate(id, {
        status: status,
      });
      if (existingUser) {
        let message;
        if (status === "approved") {
          message = "complaint is approved";
        } else if (status === "rejected") {
          message = "complaint is rejected";
        } else {
          message = "complaint is pending";
        }
        return res.status(200).json({
          status: 200,
          success: true,
          message: message,
        });
      } else {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "unable to find user",
        });
      }
    } else {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "please provide valid id",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: " something went wrong",
      error: error.message,
    });
  }
});
app.get("/getAllUser/user", async (req, res) => {
  try {
    const { id } = req.query;
    if (id) {
      const user = await signUp.findById(id);
      if (user) {
        return res.status(200).json({
          status: 200,
          success: true,
          message: " user by id",
          data: user,
        });
      } else {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "unable to find user by id",
        });
      }
    } else {
      const user = await signUp.find();
      if (user) {
        return res.status(200).json({
          status: 200,
          success: true,
          message: "all users",
          data: user,
        });
      } else {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "unable to find users",
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: " something went wrong",
      error: error.message,
    });
  }
});

app.get("/complaints/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const complaints = await complaint.find({ userId });

    if (complaints.length > 0) {
      return res.status(200).json({
        status: 200,
        success: true,
        message: "Complaints by userId",
        data: complaints,
      });
    } else {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "No complaints found for the provided userId",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
});


//======================================Search Hotel==========================================//
const hotelsSchema = new mongoose.Schema({
  images: [String],
  hotelName: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  startDate: {  
    type: Date,
    required: true,
  },
  endDate: {
    type: Date, 
    required: true,
  },
  guests: {
    type: String,
    required: true, 
    },
    hotelsPolicy: {
      type: String,
      required: true, 
      },
      description: {
        type: String,
        required: true, 
        },
  numRooms: {            
    type: String,
    required: true, 
  },
  localId: {
    type: Boolean,
    default: false,
  },
  maritalStatus: {
    type: String,
    required: true,
  },
  Availability: {
    type: String,
    required: true,
  },
  moreOptions: [String],
  amenities: [String],
  reviews : String,
  rating : Number
});

const Hotels = mongoose.model('Hotels', hotelsSchema);

//===================================================================================================================================
app.post('/hotels/create/new', upload, async (req, res) => {
  try {
    const { hotelName,rating , destination, price,  startDate, endDate, guests, numRooms, localId, maritalStatus, availability,moreOptions,amenities,reviews} = req.body;
    const images = req.files.map((file) => file.location);

    const newHotel = new Hotels({
      images,
      hotelName,
      destination,
      price,
      rating,
      startDate,
      endDate,
      guests,
      numRooms,
      localId,
      maritalStatus,
      availability,
      moreOptions,
      amenities,
      reviews,
      rating
    });

    const savedHotel = await newHotel.save();
    res.status(201).json(savedHotel);
  } catch (error) {
    console.error('Error creating hotel:', error);
    res.status(500).json({ error: 'Failed to create hotel' });
  }
});


//====================================================================================================================================
// app.get('/search', async (req, res) => {
//   try {
//     const { destination, startDate, endDate, guests, numRooms, localId, moreOptions } = req.query;

//     const searchQuery = {};

//     if (destination) {
//       searchQuery.destination = destination;
//     }

//     if (startDate && endDate) {
//       searchQuery.startDate = { $gte: new Date(startDate) };
//       searchQuery.endDate = { $lte: new Date(endDate) };
//     }

//     if (guests) {
//       searchQuery.guests = guests;
//     }

//     if (numRooms) {
//       searchQuery.numRooms = numRooms;
//     }

//     // Set localId to false by default if not passed
//     if (localId !== undefined && localId !== '') {
//       searchQuery.localId = localId;
//     } else {
//       searchQuery.localId = false;
//     }

//     if (moreOptions) {
//       const options = moreOptions.split(',');
//       searchQuery.moreOptions = { $in: options };
//     }

//     const searchResults = await Hotels.find(searchQuery);
//     res.json(searchResults);
//   } catch (error) {
//     console.error('Error fetching search results:', error);
//     res.status(500).json({ error: 'Failed to fetch search results' });
//   }
// });
app.get('/search', async (req, res) => {
  try {
      const { destination, startDate, endDate, guests, numRooms, localId, moreOptions } = req.query;

      const searchQuery = {};

      if (destination) {
          searchQuery.destination = destination;
      }

      if (startDate && endDate) {
          // Checking if the start date is before the end date
          if (startDate <= endDate) {

              // Getting the hotels that are available between the start and end date
              searchQuery.startDate = { $lte: new Date(startDate) };
              searchQuery.endDate = { $gte: new Date(endDate) };
          }
      }

      if (numRooms) {
          searchQuery.numRooms = { $gte: Number(numRooms) };
      }

      // Set localId to false by default if not passed
      if (localId !== undefined && localId !== '') {
          searchQuery.localId = localId;
      } else {
          searchQuery.localId = false;
      }

      if (moreOptions) {
          const options = moreOptions.split(',');
          searchQuery.moreOptions = { $in: options };
      }

      let searchResults = await Hotels.find(searchQuery).lean();
      searchResults = searchResults.map((hotel) => {
          // Calculate extra guests by multiplying the number of guests allowed times the number of rooms
          const extraGuests = guests - (hotel.guests * Number(numRooms)) > 0 ? guests - (hotel.guests * Number(numRooms)) : 0;

          // Calculate the total price by multiplying the price per room times the number of rooms plus the extra guests times 10% of the price per room
          hotel.price = (Number(hotel.price) * Number(numRooms)) + (extraGuests * (Number(hotel.price) * 0.1));

          return hotel;
      });
      res.json(searchResults);
  } catch (error) {
      console.error('Error fetching search results:', error);
      res.status(500).json({ error: 'Failed to fetch search results' });
  }
});
//===================================get all hotels=============================
app.get('/get/all/hotels', async (req, res) => {
  try {
    const hotels = await Hotels.find();
    res.json(hotels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//=========================get hotels by state===============================//
app.get('/hotels', async (req, res) => {
  try {
    const { destination } = req.query;
    const hotels = await Hotels.find({ destination: destination });
    res.json(hotels);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

//================================get hotels by id==================
app.get('/hotels/:id', async (req, res) => {
  try {
    const data = req.params.id
    const hotels = await Hotels.findById((data));
    res.json(hotels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//===State Data============================================================
const stateSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
  },
  images: [String],
  text:[String]
});

const State = mongoose.model("State", stateSchema);
//========================get booking==================================//

//============POST API=================================
app.post("/states",upload, async (req, res) => {
  try {
    // Extract state data from the request body
    const { state, text } = req.body;
    const images = req.files.map((file) => file.location);

    const newState = new State({
      state,
      images,
      text,
    });


    await newState.save();
    res.status(200).json({ message: "State data saved successfully" });
  } catch (error) {
    console.error("Error saving state data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=========GET STATE
app.get("/statesData", async (req, res) => {
  const { state } = req.query;

  try {
    const stateData = await State.find({ state });

    if (stateData.length === 0) {
      return res
        .status(404)
        .json({ error: "No data found for the given state." });
    }

    res.status(200).json(stateData);
  } catch (error) {
    console.error("Error retrieving state data", error);
    res.status(500).json({ error: "Internal server error." });
  }
});
//======================================================================================================//
const razorpay = new Razorpay({
  key_id: " rzp_test_CE1nBQFs6SwXnC",
  key_secret: "PTYR3RDbVaNrpkmRqMhX7CKA",
});

const paymentSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotels",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: "INR",
  },
  status: {
    type: String,
    enum: ["created", "processed", "completed", "failed"],
    default: "created",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Payment = mongoose.model("Payment", paymentSchema);

//==PAYMENT API==============================
app.post("/api/payments", async (req, res) => {
  try {
    const { hotelId, userId, amount, currency } = req.body;

    const options = {
      amount: amount * 100,
      currency,
      receipt: "razorUser@gmail.com",
    };

    const payment = new Payment({
      hotelId,
      userId,
      amount,
      currency,
    });

    await payment.save();

    res.json({
      success: true,
      payment: {
        hotelId: payment.hotelId,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});
//==================================================================================================================================================
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
