const { validateToken } = require("../services/authentication");

function checkForAuthenticationCookie(cookieName) {
  return (req, res, next) => {
    const tokenCookieValue = req.cookies[cookieName];
    if (!tokenCookieValue) {
      return next(); // No token, proceed without user
    }

    try {
      const userPayload = validateToken(tokenCookieValue);
      req.user = userPayload;
    } catch (error) {
      console.warn("Invalid token:", error.message);
      // Proceed without req.user if token is invalid
    }
    return next();
  };
}

function ensureAuthenticated(req, res, next) {
  if (!req.user) {
    return res.redirect("/user/signin");
  }
  next();
}

module.exports = {
  checkForAuthenticationCookie,
  ensureAuthenticated,
};