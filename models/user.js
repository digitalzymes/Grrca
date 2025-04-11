const { createHmac, randomBytes } = require("crypto");
const { Schema, model } = require("mongoose");
const { createTokenForUser } = require("../services/authentication");

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // Ensures email is stored in lowercase for consistency
    },
    salt: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    profileImageURL: {
      type: String,
      default: "/images/default.png",
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER", // Changed to USER for security
    },
  },
  { timestamps: true }
);

// Pre-save hook for password hashing
userSchema.pre("save", function (next) {
  const user = this;

  if (!user.isModified("password")) return next();

  try {
    const salt = randomBytes(16).toString("hex"); // Explicitly specify hex encoding
    const hashedPassword = createHmac("sha256", salt)
      .update(user.password)
      .digest("hex");

    this.salt = salt;
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error); // Pass any hashing errors to Mongoose
  }
});

// Static method to match password and generate token
userSchema.static("matchPasswordAndGenerateToken", async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) {
    throw new Error("User not found with this email");
  }

  const salt = user.salt;
  const hashedPassword = user.password;

  const userProvidedHash = createHmac("sha256", salt)
    .update(password)
    .digest("hex");

  if (hashedPassword !== userProvidedHash) {
    throw new Error("Incorrect password provided");
  }

  const token = createTokenForUser(user);
  return token;
});

// Optional: Static method to verify token and get user
userSchema.static("verifyToken", async function (token) {
  const { validateToken } = require("../services/authentication");
  try {
    const payload = validateToken(token);
    const user = await this.findById(payload._id).select("-password -salt"); // Exclude sensitive fields
    if (!user) throw new Error("User not found");
    return user;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
});

const User = model("User", userSchema); // Capitalized for convention

module.exports = User;