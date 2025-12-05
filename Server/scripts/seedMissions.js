const mongoose = require('mongoose');
const { MONGO_URI } = require('../config.js'); 
const Mission = require('../models/Mission.js');

// 1. Define our test mission
const testMissions = [
    {
        missionId: "win_3_games",
        name: "First Steps",
        description: "Prove your strength in the arena by winning 3 matches.",
        picture: "icons/gaara_icon.png", // (We'll add this path later)
        goals: [
            {
                type: 'WIN_GAMES',
                amount: 3
            }
        ],
        rewards: [
            {
                type: 'character',
                characterId: 'gaara'
            },
            {
                type: 'hoyo',
                amount: 100
            }
        ]
    }
];

const seedMissions = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for mission seeding...');

        // Clear only the missions defined in this script
        for (const mission of testMissions) {
            await Mission.deleteOne({ missionId: mission.missionId });
        }
        console.log('Cleared old test missions.');

        // Insert the new missions
        await Mission.insertMany(testMissions);
        console.log('Database seeded successfully with new missions!');

    } catch (err) {
        console.error('Error seeding missions:', err.message);
    } finally {
        // Close the connection
        mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

// Run the function
seedMissions();