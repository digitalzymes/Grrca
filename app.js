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
const PORT = process.env.PORT || 8001;

// Attempt to create uploads directory, but don't fail if it doesn't work
const uploadDir = path.resolve("./public/uploads/");
const fs = require("fs"); // Explicitly require fs here
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log("Uploads directory created successfully");
    } catch (err) {
        console.warn("Failed to create uploads directory:", err.message);
        // Continue without directory if creation fails (e.g., Render restriction)
    }
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cors({ origin: "https://grrcaindia.com" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.resolve("./public")));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

// Single root route with authentication and blog fetching
app.get("/admin", ensureAuthenticated, async (req, res) => {
  const allBlogs = await Blog.find({});
  res.render("home", {
    user: req.user,
    blogs: allBlogs,
  });
});

app.get("/", (req, res) => {
  if (req.user) return res.redirect("/admin");
  res.redirect("/user/signin");
});

// Public API to fetch all blogs for frontend
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    console.log("Fetched blogs:", blogs);
    res.json(blogs);
  } catch (error) {
    console.error("Error in /api/blogs:", error);
    res.status(500).json({ message: "Error fetching blogs" });
  }
});

// Public API to fetch a single blog by ID
app.get("/api/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: "Error fetching blog" });
  }
});

app.use("/user", userRoute);
app.use("/blog", blogRoute);

app.use(errorHandler);

// Catch-all route for debugging
app.use((req, res) => {
  res.status(404).send("Page not found");
});

app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));