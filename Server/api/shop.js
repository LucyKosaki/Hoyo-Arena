const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); 
const User = require('../models/User');
const ShopItem = require('../models/ShopItem');

// @route   POST /api/shop/buy
// @desc    Purchase an item from the shop
// @access  Private
router.post('/buy', [auth], async (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.id;

    try {
        const [item, user] = await Promise.all([
            ShopItem.findOne({ itemId }),
            User.findById(userId)
        ]);

        if (!item) {
            return res.status(404).json({ msg: 'Item not found.' });
        }
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }
        if (user[item.currency] < item.cost) {
            return res.status(400).json({ msg: 'Not enough currency.' });
        }
        
        // *** NEW: Check if already purchased ***
        if (user.purchasedShopItems.includes(item.itemId)) {
            return res.status(400).json({ msg: 'You have already purchased this item.' });
        }

        if (item.type === 'character') {
            if (user.unlockedCharacters.includes(item.characterId)) {
                return res.status(400).json({ msg: 'You already own this character.' });
            }
            user.unlockedCharacters.push(item.characterId);
        }
        
        user[item.currency] -= item.cost;
        
        // *** NEW: Add to purchased list ***
        user.purchasedShopItems.push(item.itemId);

        await user.save();
        
        res.json({
            hoyo: user.hoyo,
            primogems: user.primogems,
            unlockedCharacters: user.unlockedCharacters,
            purchasedShopItems: user.purchasedShopItems, // Send the new list back
            message: `Successfully purchased ${item.name}!`
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;