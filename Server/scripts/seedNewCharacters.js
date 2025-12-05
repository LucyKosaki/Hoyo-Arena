const mongoose = require('mongoose');
const { MONGO_URI } = require('../config.js'); 
const Character = require('../models/Character.js'); 
const Effect = require('../models/Effect.js'); 

const characterData = [
    // --- Naruto (New Format) ---
    {
        id: 'naruto',
        name: 'Naruto',
        description: 'A test character.',
        passiveEffects: [], // No passives for now
        skills: [
            { 
                name: "Taijutsu", 
                cost: { any: 1 }, 
                cooldown: 0, 
                description: "Deals 15 Physical damage.",
                skillClass: 'Physical',
                executionType: 'Instant',
                instantActions: [
                    { 
                        type: 'Damage', 
                        target: 'SelectedTarget', 
                        amount: 15,
                        damageType: 'Physical'
                    }
                ]
            },
            { 
                name: "Rasengan", 
                cost: { blue: 2, any: 1 }, 
                cooldown: 2, 
                description: "Deals 40 Energy damage.",
                skillClass: 'Energy',
                executionType: 'Instant',
                instantActions: [
                    { 
                        type: 'Damage', 
                        target: 'SelectedTarget', 
                        amount: 40,
                        damageType: 'Energy'
                    }
                ]
            },
            { 
                name: "Invulnerability", 
                cost: { any: 1 }, 
                cooldown: 3, 
                description: "Become invulnerable for 1 turn.",
                skillClass: 'Strategic',
                executionType: 'Instant',
                instantActions: [
                    // This action applies a reusable Effect named "Invulnerability"
                    { 
                        type: 'ApplyEffect', 
                        target: 'Self', 
                        effectName: 'Invulnerability_1_Turn',
                        duration: 1
                    }
                ]
            },
            { 
                name: "New Skill 4", 
                cost: {}, 
                cooldown: 0, 
                description: "Desc.", 
                skillClass: 'Physical', 
                executionType: 'Instant', 
                instantActions: [] 
            }
        ]
    }
];

// --- NEW: Define the reusable Effects ---
const effectData = [
    {
        name: "Invulnerability_1_Turn",
        description: "Makes the target invulnerable for 1 turn.",
        isPermanent: false,
        isInvisible: false,
        maxStacks: 1,
        logicBlocks: [
            {
                trigger: 'OnGameStart', // This is a placeholder, a 'SetProperty' action has no trigger
                conditions: [],
                actions: [
                    // This is just an example. We'll build a 'SetProperty' action later.
                    // For now, this just shows the structure.
                ]
            }
        ]
    },
    {
        name: "DestructibleDefense",
        description: "A simple shield. This is a special effect used by the engine.",
        isPermanent: true,
        maxStacks: 9999,
        logicBlocks: [] // No logic, just a container for a number
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for NEW seeding...');

        // Clear the collections
        await Character.deleteMany({});
        await Effect.deleteMany({});
        console.log('Cleared existing characters and effects.');

        // Insert new data
        await Character.insertMany(characterData);
        await Effect.insertMany(effectData);
        console.log('Database seeded successfully with new format!');

    } catch (err) {
        console.error('Error seeding database:', err.message);
    } finally {
        mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

seedDB();