const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GachaLogSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'user', 
        required: true, 
        index: true // Index for fast lookups
    },
    bannerId: { 
        type: String, 
        required: true, 
        index: true // Index for fast lookups
    },
    rarity: { 
        type: String, 
        required: true, 
        enum: ['gold', 'purple', 'blue'] 
    },
    // We store a copy of the result
    result: {
        type: { type: String, required: true },
        amount: { type: Number },
        characterId: { type: String }
    },
    pullDate: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('gachalog', GachaLogSchema);