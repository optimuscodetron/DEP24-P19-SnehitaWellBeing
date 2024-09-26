const jwt = require('jsonwebtoken');

module.exports.authenticate = function(req, res, next){
    try {
        const token = req.cookies.usertoken;
        console.log("Token received:", token);
        const decoded = jwt.verify(token, "abcdef");
        req.userId = decoded.id;
        next();
    } catch(e) {
        console.error("Error during authentication:", e.message);
        res.status(401).json({message: "Unauthorized"});
    }
};