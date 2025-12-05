const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// This links a User to a Mission and tracks their progress
const UserMissionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    missionId: { // The string ID, e.g., "win_3_games"
        type: String,
        required: true
    },
    // We use a flexible object to store progress for different goal types
    progress: {
        // e.g., { "WIN_GAMES": 2, "WIN_WITH_CHAR_gaara": 1 }
        type: Map,
        of: Number,
        default: {}
    },
    isCompleted: { // Is the mission done?
        type: Boolean,
        default: false
    },
    isClaimed: { // Has the reward been collected?
        type: Boolean,
        default: false
    }
});

// Create a compound index to ensure a user can only have one entry per mission
UserMissionSchema.index({ userId: 1, missionId: 1 }, { unique: true });

module.exports = mongoose.model('usermission', UserMissionSchema);