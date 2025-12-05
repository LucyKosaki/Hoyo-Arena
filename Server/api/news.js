const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth'); // Assume you have auth middleware for admin checks
const NewsArticle = require('../models/NewsArticle');

// --- MULTER SETUP FOR IMAGE UPLOADS ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        // Create unique filename: image-uuid.jpg
        cb(null, 'news-' + uuidv4() + path.extname(file.originalname));
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('image'); // Expecting form field name 'image'


// ================= ROUTES =================

// @route   POST api/news/upload
// @desc    Upload an image file and return its path (Used by Rich Text Editor)
// @access  Private (Admin only ideally)
router.post('/upload', auth, (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ msg: err });
        }
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }
        // Return the path that the frontend can use to display the image
        // IMPORTANT: Replace localhost:5000 with your actual server URL in production
        const fullUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ url: fullUrl, path: req.file.path });
    });
});


// @route   GET api/news/portal
// @desc    Get all PUBLISHED articles for the main website (public)
// @access  Public
router.get('/portal', async (req, res) => {
    try {
        const articles = await NewsArticle.find({ isPublished: true }).sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET api/news/admin
// @desc    Get ALL articles (published or draft) for admin panel
// @access  Private (Admin)
router.get('/admin', auth, async (req, res) => {
    try {
        const articles = await NewsArticle.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   POST api/news
// @desc    Create a new article
// @access  Private (Admin)
router.post('/', auth, async (req, res) => {
    try {
        const newArticle = new NewsArticle(req.body);
        const article = await newArticle.save();
        res.json(article);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   PUT api/news/:id
// @desc    Update an article
// @access  Private (Admin)
router.put('/:id', auth, async (req, res) => {
    try {
        let article = await NewsArticle.findById(req.params.id);
        if (!article) return res.status(404).json({ msg: 'Article not found' });

        // Update fields based on request body
        Object.assign(article, req.body);
        
        await article.save();
        res.json(article);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   DELETE api/news/:id
// @desc    Delete an article
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        const article = await NewsArticle.findById(req.params.id);
        if (!article) return res.status(404).json({ msg: 'Article not found' });

        await article.deleteOne();
        res.json({ msg: 'Article removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;