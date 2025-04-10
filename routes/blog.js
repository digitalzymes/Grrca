const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // Explicitly imported

const Blog = require("../models/blog");
const { ensureAuthenticated } = require("../middlewares");

const router = Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.resolve("./public/uploads/");
        // Safely create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
            } catch (err) {
                console.error("Failed to create uploads directory:", err);
                return cb(err, uploadDir); // Pass error to multer
            }
        }
        cb(null, uploadDir);
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
    res.render("blog", {
        user: req.user,
        blog,
    });
});

router.post("/", upload.single("coverImage"), async (req, res) => {
    try {
        if (!req.user) {
            console.log("User not authenticated");
            return res.status(401).send("Please sign in");
        }

        console.log("Request Body:", req.body);
        console.log("Uploaded File:", req.file);

        const { title, body } = req.body;
        if (!title || !body) {
            console.log("Validation failed: title or body missing", { title, body });
            return res.status(400).send("Title and body are required");
        }

        const blog = await Blog.create({
            body,
            title,
            createdBy: req.user._id,
            coverImageURL: req.file ? `/uploads/${req.file.filename}` : null,
        });
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
    if (!req.user) return res.redirect("/user/signin");
    const { title, body } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send("Blog not found");
    if (blog.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).send("You can only edit your own blogs");
    }

    blog.title = title;
    blog.body = body;
    if (req.file) {
        const oldImagePath = path.resolve(`./public${blog.coverImageURL}`);
        if (fs.existsSync(oldImagePath)) {
            try {
                fs.unlinkSync(oldImagePath); // Delete old image
            } catch (err) {
                console.error("Failed to delete old image:", err);
            }
        }
        blog.coverImageURL = `/uploads/${req.file.filename}`;
    }
    await blog.save();
    return res.redirect(`/blog/${blog._id}`);
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
    if (fs.existsSync(imagePath)) {
        try {
            fs.unlinkSync(imagePath); // Delete the image file
        } catch (err) {
            console.error("Failed to delete image:", err);
        }
    }

    await Blog.findByIdAndDelete(req.params.id);
    return res.redirect("/");
});

module.exports = router;