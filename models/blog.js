const { Schema, model } = require("mongoose");

const blogSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    coverImage: {
      data: Buffer,
      contentType: {
        type: String,
        enum: ["image/jpeg", "image/png"], // Restrict to specific formats
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // Must match the exact model name "User"
    },
  },
  { timestamps: true }
);

const Blog = model("Blog", blogSchema); // Consistent model name

module.exports = Blog;