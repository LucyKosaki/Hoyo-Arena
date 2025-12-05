const jwt = require('jsonwebtoken');

// This function acts as a "gatekeeper" for our API routes
function auth(req, res, next) {
    const token = req.header('x-auth-token');

    // Check for token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Add user from payload to the request object
        req.user = decoded.user;
        next(); // Move to the next function (the route handler)
    } catch (e) {
        res.status(400).json({ msg: 'Token is not valid' });
    }
}

module.exports = auth;