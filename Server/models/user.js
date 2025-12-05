const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    elo: {
        type: Number,
        default: 1000
    },
    hoyo: {
        type: Number,
        default: 0
    },
    primogems: {
        type: Number,
        default: 0
    },
    currentWinStreak: {
        type: Number,
        default: 0
    },
    unlockedCharacters: {
        type: [String],
        default: ['naruto', 'sakura', 'kakashi', 'sasuke', 'orochimaru', 'kabuto'] 
    },
    // *** NEW FIELD ***
    purchasedShopItems: {
        type: [String], // e.g., ["buy_amber", "pack_100_hoyo"]
        default: []
    },
    registerDate: {
        type: Date,
        default: Date.now
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('user', UserSchema);