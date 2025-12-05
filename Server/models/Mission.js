const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Defines a single goal
const GoalSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['WIN_GAMES', 'WIN_STREAK'] 
    },
    amount: { type: Number, default: 1 },
    description: { type: String }, 

    // --- Own Team Constraints ---
    requiredCharacters: [String], 
    requiredCategories: [String],
    logic: { 
        type: String, 
        enum: ['AND', 'OR'], 
        default: 'OR' 
    }, 

    // --- Opponent Team Constraints ---
    opponentCharacters: [String],
    opponentCategories: [String]

}, { _id: false });

// Defines a single reward
const RewardSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['hoyo', 'primogems', 'character']
    },
    amount: { type: Number },
    characterId: { type: String }
}, { _id: false });

const MissionSchema = new Schema({
    missionId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    picture: { type: String, default: 'default_mission_icon.png' },
    
    category: { 
        type: String, 
        default: 'Others',
        enum: ['Guns Girl Z', 'Honkai Impact 3rd', 'Tears of Themis', 'Genshin Impact', 'Honkai Star Rail', 'Zenless Zone Zero', 'Honkai Nexus Anima', 'Petit Planet', 'Varsapura', 'Others']
    },
    order: { type: Number, default: 0 },

    // --- NEW: Unlock Requirements (Updated for Multiple IDs) ---
    requirements: {
        minElo: { type: Number, default: 0 },
        previousMissionIds: [{ type: String }] // Changed from single ID to Array
    },

    goals: [GoalSchema],
    rewards: [RewardSchema]
});

module.exports = mongoose.model('mission', MissionSchema);