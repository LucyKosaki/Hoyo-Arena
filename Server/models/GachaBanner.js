const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RewardPoolItemSchema = new Schema({
    type: { 
        type: String, 
        required: true, 
        enum: ['hoyo', 'primogems', 'character'] 
    },
    amount: { type: Number },
    characterId: { type: String }
}, { _id: false });

const RaritySchema = new Schema({
    rarity: { 
        type: String, 
        required: true, 
        enum: ['gold', 'purple', 'blue'] 
    },
    rate: { 
        type: Number, 
        required: true 
    },
    pool: [RewardPoolItemSchema]
}, { _id: false });

const GachaBannerSchema = new Schema({
    bannerId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    rules: {
        type: String,
        default: "This banner has no special rules."
    },
    cost: { 
        type: Number, 
        default: 1 
    },
    currency: { 
        type: String, 
        default: 'primogems' 
    },
    // *** NEW PITY FIELDS ***
    pity: {
        gold: {
            applies: { type: Boolean, default: false },
            limit: { type: Number, default: 90 }
        },
        purple: {
            applies: { type: Boolean, default: false },
            limit: { type: Number, default: 10 }
        }
    },
    // ***
    rarities: [RaritySchema]
});

module.exports = mongoose.model('gachabanner', GachaBannerSchema);