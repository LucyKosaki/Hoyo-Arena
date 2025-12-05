const mongoose = require('mongoose');
const { MONGO_URI } = require('../config.js'); 
const GachaBanner = require('../models/GachaBanner.js');

const bannerData = [
    {
        bannerId: "genshin_banner",
        name: "Genshin Banner",
        cost: 1,
        currency: "primogems",
        rules: "Guaranteed 4-star (Purple) or higher every 10 pulls.\nGuaranteed 5-star (Gold) or higher every 90 pulls.",
        // *** NEW: Define the pity limits ***
        pity: {
            gold: {
                applies: true,
                limit: 90
            },
            purple: {
                applies: true,
                limit: 10
            }
        },
        rarities: [
            {
                rarity: "gold",
                rate: 0.03, // 3%
                pool: [
                    { type: "character", characterId: "amber" }
                ]
            },
            {
                rarity: "purple",
                rate: 0.14, // 14%
                pool: [
                    { type: "hoyo", amount: 10 }
                ]
            },
            {
                rarity: "blue",
                rate: 0.83, // 83%
                pool: [
                    { type: "hoyo", amount: 1 }
                ]
            }
        ]
    }
];

const seedBanners = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for banner seeding...');

        // Clear only the banners defined in this script
        for (const banner of bannerData) {
            await GachaBanner.deleteOne({ bannerId: banner.bannerId });
        }
        console.log('Cleared old test banners.');

        // Insert the new banners
        await GachaBanner.insertMany(bannerData);
        console.log('Database seeded successfully with new banners (with pity)!');

    } catch (err) {
        console.error('Error seeding banners:', err.message);
    } finally {
        // Close the connection
        mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

// Run the function
seedBanners();