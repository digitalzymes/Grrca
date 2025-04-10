const { Router } = require("express");
// const multer = require("multer"); // Temporarily commented out
const path = require("path");
// const fs = require("fs"); // Temporarily commented out

const Blog = require("../models/blog");
const { ensureAuthenticated } = require("../middlewares");

const router = Router();

// Commented out multer configuration
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadDir = path.resolve("./public/uploads/");
//     try {
//       if (!fs.existsSync(uploadDir)) {
//         fs.mkdirSync(uploadDir, { recursive: true });
//       }
//       cb(null, uploadDir);
//     } catch (err) {
//       console.error("Failed to access uploads directory:", err);
//       cb(new Error("File system access restricted"), uploadDir);
//     }
//   },
//   filename: function (req, file, cb) {
//     const fileName = `${Date.now()}-${file.originalname}`;
//     cb(null, fileName);
//   },
// });

// const upload = multer({ storage: storage });

router.use(ensureAuthenticated);

// Add New Blog Page
router.get("/add-new", (req, res) => {
  if (!req.user) return res.redirect("/user/signin");
  res.render("addBlog", { user: req.user });
});

// View Blog Details
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    if (!blog) {
      return res.status(404).send("Blog not found");
    }
    res.render("blog", { user: req.user, blog });
  } catch (error) {
    console.error("Error loading blog:", error);
    res.status(500).send("Error loading blog");
  }
});

router.post("/", async (req, res) => { // Removed upload.single
  try {
    if (!req.user) {
      console.log("User not authenticated");
      return res.status(401).send("Please sign in");
    }

    const { title, body } = req.body;
    if (!title || !body) {
      console.log("Validation failed:", { title, body });
      return res.status(400).send("Title and body are required");
    }

    const blog = await Blog.create({
      body,
      title,
      createdBy: req.user._id,
      coverImageURL: null, // No file upload for now
    });
    console.log("Blog created:", blog._id);
    res.redirect(`/blog/${blog._id}`);
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).send("Error creating blog: " + error.message);
  }
});

// Edit Blog Page
router.get("/edit/:id", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).send("Blog not found");
  if (blog.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).send("You can only edit your own blogs");
  }
  res.render("editBlog", { user: req.user, blog });
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