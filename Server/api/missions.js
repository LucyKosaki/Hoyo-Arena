const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); 
const User = require('../models/User');
const Mission = require('../models/Mission');
const UserMission = require('../models/UserMission');

// @route   POST /api/missions/claim
// @desc    Claim a completed mission's rewards
// @access  Private
router.post('/claim', [auth], async (req, res) => {
    const { missionId } = req.body;
    const userId = req.user.id;

    try {
        // 1. Find the user's progress on this mission
        const userMission = await UserMission.findOne({ userId, missionId });

        if (!userMission) {
            return res.status(404).json({ msg: 'Mission progress not found.' });
        }
        if (!userMission.isCompleted) {
            return res.status(400).json({ msg: 'Mission is not yet completed.' });
        }
        if (userMission.isClaimed) {
            return res.status(400).json({ msg: 'Mission already claimed.' });
        }

        // 2. Find the mission's rewards
        const mission = await Mission.findOne({ missionId });
        if (!mission) {
            return res.status(404).json({ msg: 'Mission definition not found.' });
        }

        // 3. Find the user to give them the rewards
        const user = await User.findById(userId);
        
        // 4. Apply rewards
        let newCharacters = [];
        let newHoyo = 0;
        let newPrimogems = 0;

        for (const reward of mission.rewards) {
            if (reward.type === 'hoyo') {
                user.hoyo += reward.amount;
                newHoyo += reward.amount;
            }
            if (reward.type === 'primogems') {
                user.primogems += reward.amount;
                newPrimogems += reward.amount;
            }
            if (reward.type === 'character') {
                if (!user.unlockedCharacters.includes(reward.characterId)) {
                    user.unlockedCharacters.push(reward.characterId);
                    newCharacters.push(reward.characterId);
                }
            }
        }

        // 5. Mark as claimed and save
        userMission.isClaimed = true;
        
        await user.save();
        await userMission.save();
        
        // 6. Send back the updated user data
        res.json({
            hoyo: user.hoyo,
            primogems: user.primogems,
            unlockedCharacters: user.unlockedCharacters,
            claimedMissionId: missionId,
            rewards: {
                hoyo: newHoyo,
                primogems: newPrimogems,
                characters: newCharacters
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// We need to export the router
module.exports = router;