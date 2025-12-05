const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GameMatchSchema = new Schema({
    isRanked: {
        type: Boolean,
        default: false
    },
    winnerId: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    loserId: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    
    // --- THIS IS THE NEW STRUCTURE ---
    // We no longer store team1_characters and team2_characters
    player1: {
        userId: { type: Schema.Types.ObjectId, ref: 'user' },
        characters: [String]
    },
    player2: {
        userId: { type: Schema.Types.ObjectId, ref: 'user' },
        characters: [String]
    },
    // ---
    
    matchDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('gamematch', GameMatchSchema);