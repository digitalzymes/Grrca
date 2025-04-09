// middlewares/index.js
module.exports = {
    errorHandler: require("./errorhandler"),
    checkForAuthenticationCookie: require("./authentication").checkForAuthenticationCookie,
    ensureAuthenticated: require("./authentication").ensureAuthenticated,
  };