const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserPitySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true // We will search by this
    },
    bannerId: { // The string ID, e.g., "genshin_banner"
        type: String,
        required: true,
        index: true // We will search by this
    },
    goldPity: { // Counts up to the banner's limit (e.g., 90)
        type: Number,
        default: 0
    },
    purplePity: { // Counts up to the banner's limit (e.g., 10)
        type: Number,
        default: 0
    }
});

// A user can only have one pity document per banner
UserPitySchema.index({ userId: 1, bannerId: 1 }, { unique: true });

module.exports = mongoose.model('userpity', UserPitySchema);