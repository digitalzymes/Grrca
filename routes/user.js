const { Router } = require("express");
const User = require("../models/user");
const Blog = require("../models/blog"); // Add this to fetch blogs
const { ensureAuthenticated } = require("../middlewares"); // Import middleware

const router = Router();

router.get("/signin", (req, res) => {
  if (req.user) return res.redirect("/");
  return res.render("signin");
});

router.get("/signup", (req, res) => {
  if (req.user) return res.redirect("/");
  return res.render("signup");
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await User.matchPasswordAndGenerateToken(email, password);
    return res.cookie("token", token).redirect("/"); // Changed from "/admin" to "/"
  } catch (error) {
    return res.render("signin", { error: "Incorrect Email or Password" });
  }
});

router.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    await User.create({ fullName, email, password });
    return res.redirect("/"); // Changed from "/admin" to "/"
  } catch (error) {
    console.error("Signup error:", error);
    return res.render("signup", {
      error: error.message || "Failed to create account. Please try again.",
    });
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("token").redirect("/user/signin");
});

// New /admin route
router.get("/admin", ensureAuthenticated, async (req, res) => {
  try {
    const allBlogs = await Blog.find({})
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 });
    res.render("admin", {
      user: req.user,
      blogs: allBlogs,
      error: null,
    });
  } catch (error) {
    console.error("Error fetching admin page:", error);
    res.render("admin", {
      user: req.user,
      blogs: [],
      error: error.message || "Failed to load admin page",
    });
  }
});

module.exports = router;
