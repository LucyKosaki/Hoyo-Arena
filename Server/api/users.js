const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import our new User model
const User = require('../models/User');

/**
 * @route   POST /api/users/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Check if user already exists in the DB
        let user = await User.findOne({ username: username });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // 2. Create new user instance (but don't save yet)
        user = new User({
            username: username,
            password: password
            // elo and unlockedCharacters are set by default
        });

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // 4. Save to the database
        await user.save();
        
        console.log("Registered new user:", user.username);
        res.status(201).json({ msg: 'User registered successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


/**
 * @route   POST /api/users/login
 * @desc    Log in a user
 * @access  Public
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Simple validation
    if (!username || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        // Check for existing user
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: 'User does not exist' });

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        // Create the payload for the token AND the response
        const userPayload = {
            id: user.id,
            username: user.username,
            // Add other non-sensitive fields you might need on the frontend here
            elo: user.elo 
        };

        // Sign token
        jwt.sign(
            { user: userPayload }, // Embed user data in the token itself
            process.env.JWT_SECRET,
            { expiresIn: 3600 * 24 * 7 }, // 7 days
            (err, token) => {
                if (err) throw err;
                // --- THE FIX IS HERE ---
                // Send BOTH the token AND the user data back to the client in JSON response
                res.json({
                    token,
                    user: userPayload 
                });
                // -----------------------
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;