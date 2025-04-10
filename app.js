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
const PORT = process.env.PORT || 10000;

mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cors({ origin: "https://grrcaindia.com" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("./public")));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

// Simplified /admin route
app.get("/admin", ensureAuthenticated, async (req, res) => {
  try {
    const allBlogs = await Blog.find({});
    res.render("home", { user: req.user, blogs: allBlogs });
  } catch (error) {
    console.error("Error in /admin:", error);
    res.status(500).send("Error loading admin page");
  }
});

app.get("/", (req, res) => {
  if (req.user) return res.redirect("/admin");
  res.redirect("/user/signin");
});

// Public APIs with error handling
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching blogs" });
  }
});

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

app.use((req, res) => {
  res.status(404).send("Page not found");
});

app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));