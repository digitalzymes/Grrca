const { Router } = require("express");
const User = require("../models/user");

const router = Router();

router.get("/signin", (req, res) => {
  if (req.user) return res.redirect("/"); // If logged in, go to home
  return res.render("signin");
});

router.get("/signup", (req, res) => {
  if (req.user) return res.redirect("/"); // If logged in, go to home
  return res.render("signup");
});

// In /user/signin POST
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await User.matchPasswordAndGenerateToken(email, password);
    return res.cookie("token", token).redirect("/admin"); // Changed from "/"
  } catch (error) {
    return res.render("signin", { error: "Incorrect Email or Password" });
  }
});

// In /user/signup POST
router.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    await User.create({ fullName, email, password });
    return res.redirect("/admin");
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.render("signup", { error: "Email already in use." });
    }
    console.error("Signup error:", error);
    return res.render("signup", {
      error: "Something went wrong. Please try again.",
    });
  }
});




// In /user/logout
router.get("/logout", (req, res) => {
  res.clearCookie("token").redirect("/user/signin"); // Changed from "/"
});

module.exports = router;
