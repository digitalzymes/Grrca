const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises; // Using promises version for better async handling

const Blog = require("../models/blog");
const { ensureAuthenticated } = require("../middlewares");

const router = Router();

// Multer configuration with file filter and limits
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.resolve("./public/uploads/");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const fileName = `${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  });

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only images are allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.use(ensureAuthenticated);

// Add New Blog Page
router.get("/add-new", (req, res) => {
  if (!req.user) return res.redirect("/user/signin");
  return res.render("addBlog", {
    user: req.user,
  });
});

// View Blog Details
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    if (!blog) {
      console.log(`Blog not found for ID: ${req.params.id}`);
      return res.status(404).send("Blog not found");
    }
    res.render("blog", {
      user: req.user,
      blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    return res.status(500).send("Error loading blog page");
  }
});

// Create Blog
router.post("/", upload.single("coverImage"), async (req, res) => {
  try {
    if (!req.user) {
      console.log("User not authenticated");
      return res.status(401).send("Please sign in");
    }

    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file);
    console.log("User ID:", req.user._id); // Add this to verify

    const { title, body } = req.body;
    if (!title || !body) {
      console.log("Validation failed: title or body missing", { title, body });
      return res.status(400).send("Title and body are required");
    }

    const blog = await Blog.create({
      body,
      title,
      createdBy: req.user._id, // Ensure this is a valid ObjectId
      coverImageURL: req.file ? `/uploads/${req.file.filename}` : null,
    });
    console.log("Blog created successfully:", blog);
    return res.redirect(`/blog/${blog._id}`);
  } catch (error) {
    console.error("Error creating blog:", error);
    return res.status(500).send("Error creating blog: " + error.message);
  }
});
// Edit Blog Page
router.get("/edit/:id", async (req, res) => {
  try {
    if (!req.user) return res.redirect("/user/signin");
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send("Blog not found");
    if (blog.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send("You can only edit your own blogs");
    }
    res.render("editBlog", {
      user: req.user,
      blog,
    });
  } catch (error) {
    console.error("Error fetching blog for edit:", error);
    res.status(500).send("Error loading edit page");
  }
});

// Update Blog
router.post("/edit/:id", upload.single("coverImage"), async (req, res) => {
  try {
    if (!req.user) return res.redirect("/user/signin");
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send("Blog not found");
    if (blog.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send("You can only edit your own blogs");
    }

    const { title, body } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).send("Title and body are required");
    }

    blog.title = title.trim();
    blog.body = body.trim();

    if (req.file) {
      // Delete old image if it exists
      if (blog.coverImageURL) {
        const oldImagePath = path.resolve(`./public${blog.coverImageURL}`);
        await fs
          .unlink(oldImagePath)
          .catch((err) => console.log("Error deleting old image:", err));
      }
      blog.coverImageURL = `/uploads/${req.file.filename}`;
    }

    await blog.save();
    return res.redirect(`/blog/${blog._id}`);
  } catch (error) {
    console.error("Error updating blog:", error);
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

    // Delete image if it exists
    if (blog.coverImageURL) {
      const imagePath = path.resolve(`./public${blog.coverImageURL}`);
      await fs
        .unlink(imagePath)
        .catch((err) => console.log("Error deleting image:", err));
    }

    await Blog.findByIdAndDelete(req.params.id);
    return res.redirect("/");
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).send("Error deleting blog: " + error.message);
  }
});

module.exports = router;
