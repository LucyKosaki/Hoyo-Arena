const mongoose = require('mongoose');

const NewsArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  // 'content' will store the full HTML from the rich text editor, including image tags
  content: {
    type: String,
    required: true
  },
  // A short version for the grid preview
  preview: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['EVENT', 'PATCH NOTES', 'NOTICE', 'COMMUNITY'],
    default: 'NOTICE'
  },
  // Path to the main header image used in the grid
  headerImagePath: {
    type: String
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NewsArticle', NewsArticleSchema);