const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Blog = require("../models/blog");

const { ensureAuthenticated } = require("../middlewares");

const router = Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.resolve("./public/uploads");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    }   
});

router.use(ensureAuthenticated);

const upload = multer({ storage: storage });

// Add New Blog Page
router.get("/add-new", (req, res) => {
    if (!req.user) return res.redirect("/user/signin");
    return res.render("addBlog", {
        user: req.user,
    });
});

// View Blog Details
router.get("/:id", async (req, res) => {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    if (!blog) return res.status(404).send("Blog not found");
    res.render("blog", {
        user: req.user,
        blog,
    });
});

// Add New Blog
router.post("/", upload.single("coverImage"), async (req, res) => {
    try {
        if (!req.user) {
            console.log("User not authenticated");
            return res.status(401).send("Please sign in");
        }

        const { title, body } = req.body;
        if (!title || !body) {
            console.log("Validation failed: title or body missing", { title, body });
            return res.status(400).send("Title and body are required");
        }

        const blogData = {
            title,
            body,
            createdBy: req.user._id,
            coverImageURL: req.file ? `/uploads/${req.file.filename}` : null,
        };

        const blog = await Blog.create(blogData);
        console.log("Blog created successfully:", blog._id);
        return res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error("Error creating blog:", error);
        return res.status(500).send("Error creating blog: " + error.message);
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
    res.render("editBlog", {
        user: req.user,
        blog,
    });
});

// Update Blog
router.post("/edit/:id", upload.single("coverImage"), async (req, res) => {
    try {
        if (!req.user) return res.redirect("/user/signin");
        const { title, body } = req.body;
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).send("Blog not found");
        if (blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).send("You can only edit your own blogs");
        }

        blog.title = title || blog.title;
        blog.body = body || blog.body;
        if (req.file) {
            const oldImagePath = path.resolve(`./public${blog.coverImageURL}`);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            blog.coverImageURL = `/uploads/${req.file.filename}`;
        }
        await blog.save();
        return res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error("Error updating blog:", error);
        return res.status(500).send("Error updating blog: " + error.message);
    }
});

// Delete Blog
router.post("/delete/:id", async (req, res) => {
    if (!req.user) return res.redirect("/user/signin");
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send("Blog not found");
    if (blog.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).send("You can only delete your own blogs");
    }

    const imagePath = path.resolve(`./public${blog.coverImageURL}`);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await Blog.findByIdAndDelete(req.params.id);
    return res.redirect("/");
});

module.exports = router;