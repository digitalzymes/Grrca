require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const Blog = require("./models/blog");

const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");

const {
  checkForAuthenticationCookie,
  ensureAuthenticated,
  errorHandler,
} = require("./middlewares");

const app = express();
const PORT = process.env.PORT || 5001;

// MongoDB Connection
mongoose
  .connect( process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middleware
app.use(
  cors({
    origin: "https://grrcaindia.com",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.resolve("./public")));
app.use(express.static(path.resolve("./node_modules"))); // Serve CKEditor
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

// Root Route (Home/Dashboard)
app.get("/", async (req, res) => {
  let error = null;
  try {
    if (!req.user) return res.redirect("/user/signin");
    console.log("User object passed to template:", req.user);
    const allBlogs = await Blog.find({})
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 });
    console.log(
      "Fetched blogs with createdBy details:",
      allBlogs.map((blog) => ({
        title: blog.title,
        createdBy: blog.createdBy ? { _id: blog.createdBy._id, fullName: blog.createdBy.fullName } : "null",
      }))
    );
    res.render("home", {
      user: req.user,
      blogs: allBlogs,
      error: error,
    });
  } catch (err) {
    error = err.message || "Unknown error";
    console.error("Critical error fetching blogs:", {
      message: error,
      stack: err.stack,
    });
    res.status(500).render("home", {
      user: req.user,
      blogs: [],
      error: error,
    });
  }
});
// Public API Routes
// Public API Routes
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find({})
      .populate("createdBy")
      .sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error("API Error fetching blogs:", error);
    res.status(500).json({ message: "Error fetching blogs" });
  }
});

app.get("/api/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (error) {
    console.error("API Error fetching blog:", error);
    res.status(500).json({ message: "Error fetching blog" });
  }
});

// Route Handlers
app.use("/user", userRoute);
app.use("/blog", blogRoute);

// Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));