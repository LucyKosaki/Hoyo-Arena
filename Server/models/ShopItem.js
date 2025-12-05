const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShopItemSchema = new Schema({
    // A unique ID for this shop entry, e.g., "buy_amber"
    itemId: {
        type: String,
        required: true,
        unique: true
    },
    // What is being sold?
    type: {
        type: String,
        required: true,
        enum: ['character', 'currency_pack'] // We can add more types later
    },
    // The ID of the item being sold, if applicable
    characterId: {
        type: String // e.g., "amber"
    },
    // Cost details
    cost: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true,
        enum: ['hoyo', 'primogems'],
        default: 'hoyo'
    },
    // Display details
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    icon_url: {
        type: String,
        default: 'icons/default_icon.png' // Placeholder
    }
});

module.exports = mongoose.model('shopitem', ShopItemSchema);