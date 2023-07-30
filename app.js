//jshint esversion:6

const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const ejs = require("ejs");
var path = require('path');
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const cryptoJS = require("crypto-js");
const homeStartingContent =
  "Hi welcome to home ,now onward no need to worry about whether anyone read my diary. Now make it personal and secure with MyDiary. Start writing blogs,your daily updates and what happen in the day.";
const aboutContent =
  "We are MyDiary providing platform for users to write their personalize blogs.now onward no need to worry about whether anyone read my diary. Now make it personal and secure with MyDiary. Start writing blogs,your daily updates and what happen in the day. ";
const contactContent =
  "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";
const postseckey = process.env.SECPOSTKEY;
const app = express();
const PORT = 3000 || process.env.PORT;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: "Personalize blogs",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 60 * 60 * 1000 },
  })
);



//Connecting to Database
mongoose.connect(process.env.DB_STRING, { useNewUrlParser: true });

//USER SCHEMA
const userSchema = {
  name: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
  },

  password: {
    type: String,
    require: true,
  },
};

const User = mongoose.model("User", userSchema);

//POST SCHEMA
const postSchema = {
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  userid: {
    type: String,
    required: true,
  },
};

const Post = mongoose.model("Post", postSchema);

app.get("/home", function async(req, res) {
  if (req.session.username != null) {
    Post.find({ userid: req.session.userid }).then(function await(posts) {
      res.render("home", {
        username: req.session.username,
        StartingContent: homeStartingContent,
        post: posts,
        seckey: postseckey,
        CryptoJS: cryptoJS
      });
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/about", function (req, res) {
  res.render("about", { about: aboutContent });
});

app.get("/contact", function (req, res) {
  res.render("contact", { contact: contactContent });
});

// Compose Posts
app.get("/compose", function (req, res) {
  if (req.session.username != null) {
    res.render("compose");
  } else {
    res.redirect("/login");
  }
});

app.post("/compose", function (req, res) {
  // Encryption of post

  const titlename = req.body.postTitle;
  const content = req.body.postBody;

  const postTitle = cryptoJS.AES.encrypt(titlename, postseckey).toString();
  const postContent = cryptoJS.AES.encrypt(content, postseckey).toString();

  const post = new Post({
    title: postTitle,
    content: postContent,
    userid: req.session.userid,
  });
  post.save().then(() => {
    res.redirect("/home");
  });
});

//Render Individual Post
app.get("/post/:postId", function (req, res) {
  const requestedPostId = req.params.postId;

  Post.findOne({ _id: requestedPostId }).then(function (post) {
    //  console.log("Delete PostId "+post._id);
    req.session.deletepostId = post._id;

    const bytes = cryptoJS.AES.decrypt(post.title, postseckey);
    const postTitle = bytes.toString(cryptoJS.enc.Utf8);

    const conbytes = cryptoJS.AES.decrypt(post.content, postseckey);
    const postContent = conbytes.toString(cryptoJS.enc.Utf8);

    res.render("post", {
      title: postTitle,

      content: postContent,
    });
  });
});

//Delete Post
app.get("/deletepost", function (req, res) {
  Post.deleteOne({ _id: req.session.deletepostId }).then(() => {
    res.redirect("/home");
  });
});

// REGISTER USER

//Display Register Page
app.get("/", function (req, res) {
  res.render("register");
});

app.post("/register", async function (req, res) {
  //Creating secure password
  const salt = await bcrypt.genSaltSync(10);
  const secpassword = await bcrypt.hashSync(req.body.password, salt);

  //Storing user to DB
  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: secpassword,
  });
  user.save().then(res.redirect("/login"));
});

//Login User

app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const useremail = await User.findOne({ email: email });

    if (bcrypt.compareSync(password, useremail.password)) {
      req.session.userid = useremail._id;
      req.session.username = useremail.name;
      res.redirect("/home");
    }else{
      res.render("login");
    }
  } catch (error) {
    loginCred=0;
      res.render("login");
  }
});

//LOGOUT

app.get("/logout", function (req, res) {
  req.session.destroy((err) => {
    res.redirect("/login"); // will always fire after session is destroyed
  });
});

app.listen(PORT , function () {
  console.log("Server started on port 3000");
});
