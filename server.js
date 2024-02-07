const express = require("express");
const app = express();
const mongoose = require("mongoose");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const secretKey = 'SecretKey';
const tokenBlacklist = new Set();
const cors = require("cors");


app.use(express.json());
app.use(cors());

const mongoUrl =
  "mongodb+srv://Srinivas:Srinivas@cluster0.eu5eekh.mongodb.net/brandWick?retryWrites=true&w=majority";

mongoose
  .connect(mongoUrl, {
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("Connected to database");
  })
  .catch((e) => console.log(e));

const ImageDetailsScehma = new mongoose.Schema(
  {
    title: String,
    description: String,
    image: String,
  },
  {
    collection: "ImageDetails",
  }
);

const Images = mongoose.model("ImageDetails", ImageDetailsScehma);

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },

});

const User = mongoose.model('User', userSchema);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "../frontend/src/images/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.get("/", async (req, res) => {
  res.send("Success!!!!!!");
});
app.post("/register", async (req, res) => {
  try {
    const { name, username, email, phone, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or phone number already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      phone,
      username,
      password: hashedPassword,
    });
    await user.save();
    console.log(user);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ email: user.email }, secretKey, { expiresIn: '1h' });
    console.log(token);
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.post("/logout", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    tokenBlacklist.add(token);
    res.status(200).json({ message: "Logout successful" });
  } else {
    res.status(400).json({ message: "Invalid token" });
  }
})

app.post("/upload-image", upload.single("image"), async (req, res) => {
  console.log(req.body);
  const { title, description } = req.body;
  const imageName = req.file.filename;

  try {
    await Images.create({ title, description, image: imageName });
    res.json({ status: "ok" });
  } catch (error) {
    res.json({ status: error });
  }
});

app.get("/get-image", async (req, res) => {
  try {
    Images.find({}).then((data) => {
      res.send({ status: "ok", data: data });
    });
  } catch (error) {
    res.json({ status: error });
  }
});

app.listen(5000, () => {
  console.log("Server Started on 5000");
});
