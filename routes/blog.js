const { Router } = require("express");
// const multer = require("multer"); // Commented out
const path = require("path");
// const fs = require("fs"); // Commented out

const Blog = require("../models/blog");
const { ensureAuthenticated } = require("../middlewares");

const router = Router();

// Commented out multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve("../public/uploads/");
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (err) {
      console.error("Failed to access uploads directory:", err);
      cb(new Error("File system access restricted"), uploadDir);
    }
  },
  filename: function (req, file, cb) {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

router.use(ensureAuthenticated);

// Add New Blog Page
router.get("/add-new", (req, res) => {
  if (!req.user) return res.redirect("/user/signin");
  res.render("addBlog", { user: req.user });
});

// View Blog Details
router.get("/:id", async (req, res) => {
  try {
    console.log("Fetching blog with ID:", req.params.id);
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    console.log("Blog fetched:", blog);
    if (!blog) {
      return res.status(404).send("Blog not found");
    }
    res.render("blog", { user: req.user, blog });
  } catch (error) {
    console.error("Error loading blog:", error);
    res.status(500).send("Error loading blog");
  }
});

router.post("/", async (req, res) => {
  try {
    if (!req.user) {
      console.log("User not authenticated");
      return res.status(401).send("Please sign in");
    }

    console.log("Received request body:", req.body); // Log the incoming data
    const { title, body } = req.body;
    if (!title || !body) {
      console.log("Validation failed:", { title, body });
      return res.status(400).send("Title and body are required");
    }

    const blogData = {
      body,
      title,
      createdBy: req.user._id,
      coverImageURL: null,
    };
    console.log("Attempting to create blog with data:", blogData);
    const blog = await Blog.create(blogData);
    console.log("Blog created with ID:", blog._id);
    res.redirect(`/blog/${blog._id}`);
  } catch (error) {
    console.error("Error creating blog:", error);
    if (error.name === "ValidationError") {
      res.status(400).send("Validation error: " + error.message);
    } else {
      res.status(500).send("Error creating blog: " + error.message);
    }
  }
});

// Edit Blog Page
router.get("/edit/:id", async (req, res) => {
  try {
    if (!req.user) {
      console.log("User not authenticated in /edit");
      return res.redirect("/user/signin");
    }
    console.log("Attempting to find blog with ID:", req.params.id);
    const blog = await Blog.findById(req.params.id);
    console.log("Blog found:", blog);
    if (!blog) {
      return res.status(404).send("Blog not found");
    }
    if (blog.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send("You can only edit your own blogs");
    }
    res.render("editBlog", { user: req.user, blog });
  } catch (error) {
    console.error("Error in /edit route:", error);
    res.status(500).send("Error loading edit page: " + error.message);
  }
});

// Update Blog
router.post("/edit/:id", async (req, res) => {
  try {
    if (!req.user) return res.redirect("/user/signin");
    const { title, body } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send("Blog not found");
    if (blog.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send("You can only edit your own blogs");
    }

    blog.title = title;
    blog.body = body;
    await blog.save();
    res.redirect(`/blog/${blog._id}`);
  } catch (error) {
    res.status(500).send("Error updating blog: " + error.message);
  }
});

// Delete Blog
router.post("/delete/:id", async (req, res) => {
  try {
    if (!req.user) return res.redirect("/user/signin");
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send("Blog not found");
    if (blog.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send("You can only delete your own blogs");
    }
    await Blog.findByIdAndDelete(req.params.id);
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Error deleting blog: " + error.message);
  }
});

module.exports = router;