//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt=require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate =require("mongoose-findOrcreate");


app.set("view engine","ejs");
app.use(express.static("public"));
app.use(bodyparser.urlencoded({extended:true}));
app.use(session({
  secret:"our little secret.",
  resave:false,
  saveUninitialized:true
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});
// const saltRounds = 10;

const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  secret:String
});
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User =new mongoose.model("User",userSchema);
// this line will create local mongoose stratagy
passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user,done){
  done(null,user.id);
});
passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){
    done(err,user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
  res.render("home");
});

app.get('/auth/google',passport.authenticate('google', { scope: ["profile"] }));
app.get('/auth/google/secrets',
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});
app.get("/secrets",function(req,res){
  User.find({"secret":{$ne:null}},function(err,foundusers){
    if(err){
      console.log(err);
    }else{
      if(foundusers){
        res.render("secrets",{userWithSecrets:foundusers});
      }
    }
  });
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.render("login");
  }
});

app.post("/submit",function(req,res){
  const postedSecret = req.body.secret;
  User.findById(req.user.id,function(err,founduser){
    if(err){
      console.log(err);
    }else{
      if(founduser){
        founduser.secret = postedSecret;
        founduser.save(function(){
          res.redirect("/secrets");
        });
      }

    }
  });

});

app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) {
      console.log(next(err));
    }else{
      res.redirect('/');
    }
  });
});
app.post("/register",function(req,res){
//   bcrypt.hash(req.body.password,saltRounds,function(err,hash){
//     const newuser = new User({
//       email:req.body.username,
//       password:hash,
//     });
//     newuser.save(function(err){
//       if(!err){
//         res.render("secrets");
//       }else{
//         console.log(err);
//       }
//     });
// });
    User.register({username:req.body.username},req.body.password,function(err,user){
      if(err){
        console.log(err);
        res.redirect("/register");
      }else{
        passport.authenticate("local")(req,res,function(){
          res.redirect("/secrets");
        });
      }
    });
});

app.post("/login",function(req,res){
  // const username = req.body.username;
  // const password = req.body.password;
  // User.findOne({email:username},function(err,foundUser){
  //   if(!err){
  //     if(foundUser){
  //       bcrypt.compare(password,foundUser.password,function(err,result){
  //         if(result === true){
  //           res.render("secrets");
  //         }
  //       });
  //     }
  //   }else{
  //     console.log(err);
  //   }
  // });
    const user = new User({
      username:req.body.username,
      password:req.body.password
    });
    req.login(user,function(err){
      if(err){
        console.log(err);
      }else{
        passport.authenticate("local")(req,res,function(){
          res.redirect("/secrets");
        });
      }
    });
});


app.listen(3000,function(){
  console.log("server started at port 3000.");
});
