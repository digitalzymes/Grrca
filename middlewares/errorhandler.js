// middlewares/errorhandler.js
function errorHandler(err, req, res, next) {
  console.error("Error:", err.message);
  res.status(500).json({ success: false, message: "Something went wrong", error: err.message });
}

module.exports = errorHandler;