const mongoose = require('mongoose');
const { MONGO_URI } = require('../config.js'); 
const ShopItem = require('../models/ShopItem.js');

// 1. Define our test shop items
const shopItems = [
    {
        itemId: "buy_amber",
        name: "Amber",
        type: "character",
        characterId: "amber", // This must match the ID you'll give her in the 'characters' collection
        cost: 150,
        currency: "hoyo",
        description: "A young and energetic outrider. The last of her kind.",
        icon_url: "icons/amber_icon.png"
    }
];

const seedShop = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for shop seeding...');

        // Clear only the items defined in this script
        for (const item of shopItems) {
            await ShopItem.deleteOne({ itemId: item.itemId });
        }
        console.log('Cleared old test shop items.');

        // Insert the new items
        await ShopItem.insertMany(shopItems);
        console.log('Database seeded successfully with new shop items!');

    } catch (err) {
        console.error('Error seeding shop:', err.message);
    } finally {
        // Close the connection
        mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

// Run the function
seedShop();