const { validateToken } = require("../services/authentication");

function checkForAuthenticationCookie(cookieName) {
  return (req, res, next) => {
    const tokenCookieValue = req.cookies[cookieName];
    if (!tokenCookieValue) {
      return next();
    }

    try {
      const userPayload = validateToken(tokenCookieValue);
      req.user = userPayload;
    } catch (error) {
    }
    return next();
  };
}

// New middleware to enforce login
function ensureAuthenticated(req, res, next) {
  if (!req.user) {
    return res.redirect("/user/signin"); // Redirect to signin if no user
  }
  next();
}

module.exports = {
  checkForAuthenticationCookie,
  ensureAuthenticated,
};
