const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); 
const User = require('../models/User');
const GachaBanner = require('../models/GachaBanner');
const GachaLog = require('../models/GachaLog');
const UserPity = require('../models/UserPity'); 

// --- Helper Function: Get or Create Pity Doc ---
async function getPity(userId, bannerId) {
    let pity = await UserPity.findOne({ userId, bannerId });
    if (!pity) {
        pity = new UserPity({ userId, bannerId });
        await pity.save();
    }
    return pity;
}

// --- Helper Function: Perform a single weighted pull WITH PITY (FIXED) ---
function performPull(banner, currentPity) {
    // --- THIS IS THE FIX (Part 1) ---
    // Increment pity *before* checking
    currentPity.goldPity++;
    currentPity.purplePity++;
    
    let roll = Math.random();
    let cumulativeRate = 0;

    const sortedRarities = banner.rarities.sort((a, b) => a.rate - b.rate);
    
    // --- PITY CHECK ---
    // Check for guaranteed Gold first
    if (banner.pity.gold.applies && currentPity.goldPity >= banner.pity.gold.limit) {
        console.log("PITY: Forcing GOLD pull");
        const pool = banner.rarities.find(r => r.rarity === 'gold').pool;
        const reward = pool[Math.floor(Math.random() * pool.length)];
        currentPity.goldPity = 0; // Reset gold
        // Do NOT reset purple pity if gold is hit (standard gacha practice)
        return { rarity: 'gold', item: reward };
    }
    
    // Check for guaranteed Purple
    if (banner.pity.purple.applies && currentPity.purplePity >= banner.pity.purple.limit) {
        console.log("PITY: Forcing PURPLE pull");
        const pool = banner.rarities.find(r => r.rarity === 'purple').pool;
        const reward = pool[Math.floor(Math.random() * pool.length)];
        currentPity.purplePity = 0; // Reset purple
        return { rarity: 'purple', item: reward };
    }
    
    // --- REGULAR ROLL ---
    for (const rarity of sortedRarities) {
        cumulativeRate += rarity.rate;
        if (roll <= cumulativeRate) {
            // We hit this rarity!
            const pool = rarity.pool;
            const reward = pool[Math.floor(Math.random() * pool.length)];
            
            // If we got a natural high-rarity, reset pity
            if (rarity.rarity === 'gold') {
                currentPity.goldPity = 0;
            }
            if (rarity.rarity === 'purple') {
                currentPity.purplePity = 0;
            }
            
            return {
                rarity: rarity.rarity,
                item: reward
            };
        }
    }
    
    // Fallback (should be unreachable if rates add up to 1.0)
    const bluePool = banner.rarities.find(r => r.rarity === 'blue').pool;
    return { rarity: 'blue', item: bluePool[0] };
}

// --- Helper Function: Apply a reward to a user ---
async function applyRewardToUser(user, item) {
    if (item.type === 'hoyo') {
        user.hoyo += item.amount;
    } else if (item.type === 'primogems') {
        user.primogems += item.amount;
    } else if (item.type === 'character') {
        if (!user.unlockedCharacters.includes(item.characterId)) {
            user.unlockedCharacters.push(item.characterId);
        }
    }
}

// @route   POST /api/gacha/pull
// @desc    Perform a single or 10-pull
// @access  Private
router.post('/pull', [auth], async (req, res) => {
    const { bannerId, pullAmount } = req.body; 
    const userId = req.user.id;

    try {
        // 1. Find the banner, the user, and the user's pity
        const [banner, user, userPity] = await Promise.all([
            GachaBanner.findOne({ bannerId }),
            User.findById(userId),
            getPity(userId, bannerId) // Get or create the pity doc
        ]);

        if (!banner) {
            return res.status(404).json({ msg: 'Banner not found.' });
        }
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        // 2. Check cost
        const totalCost = banner.cost * pullAmount;
        if (user[banner.currency] < totalCost) {
            return res.status(400).json({ msg: 'Not enough Primogems.' });
        }

        // 3. Subtract currency
        user[banner.currency] -= totalCost;

        // 4. Perform pulls
        let pullResults = [];
        let pullLogs = [];
        
        for (let i = 0; i < pullAmount; i++) {
            // Pass the pity object to be modified by the function
            const result = performPull(banner, userPity);
            pullResults.push(result);
            
            // 5. Apply reward to user immediately
            await applyRewardToUser(user, result.item);

            // 6. Create log entry
            pullLogs.push({
                userId: userId,
                bannerId: bannerId,
                rarity: result.rarity,
                result: result.item
            });
        }

        // 7. Save all database changes
        await user.save();
        await userPity.save(); // Save the updated pity counters
        await GachaLog.insertMany(pullLogs); 

        // 8. Send results back to client
        res.json({
            results: pullResults,
            hoyo: user.hoyo,
            primogems: user.primogems,
            unlockedCharacters: user.unlockedCharacters,
            pity: userPity // Send back the new pity
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/gacha/history/:bannerId
// @desc    Get paginated pull history for a banner
// @access  Private
router.get('/history/:bannerId', [auth], async (req, res) => {
    const { bannerId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page || 1, 10);
    const limit = 10; 
    const skip = (page - 1) * limit;

    try {
        const [logs, totalPulls] = await Promise.all([
            GachaLog.find({ userId, bannerId })
                .sort({ pullDate: -1 }) 
                .skip(skip)
                .limit(limit),
            GachaLog.countDocuments({ userId, bannerId })
        ]);

        res.json({
            pulls: logs,
            currentPage: page,
            totalPages: Math.ceil(totalPulls / limit)
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;