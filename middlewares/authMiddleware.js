const jwt = require("jsonwebtoken");

exports.auth = async (req, res, next) => {
  try {

    const token = req.header("Authorization").replace("Bearer ", "");
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if(!token) {
      return res.status(401).json({
        success: false,
        message: "token?"
      })
    };
  
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
  
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
