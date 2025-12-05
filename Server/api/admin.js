const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); 
const User = require('../models/User');
const Character = require('../models/Character');
const Effect = require('../models/Effect'); 
const GameMatch = require('../models/GameMatch');
const Mission = require('../models/Mission');
const ShopItem = require('../models/ShopItem');
const GachaBanner = require('../models/GachaBanner'); 

module.exports = (masterCharacterList, masterGachaBanners, masterEffectList) => {

    const adminAuth = async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id);
            if (!user.isAdmin) {
                return res.status(403).json({ msg: 'Access denied. Not an admin.' });
            }
            next(); 
        } catch (err) {
            res.status(500).send('Server Error');
        }
    };

    // --- Auth Route ---
    router.get('/auth', [auth, adminAuth], (req, res) => {
        res.json({ msg: 'Admin authenticated' });
    });

    // --- User Routes ---
    router.get('/users', [auth, adminAuth], async (req, res) => {
        try {
            const users = await User.find().select('-password').sort({ registerDate: -1 }).lean();
            res.json(users);
        } catch (err) {
            res.status(500).send('Server Error');
        }
    });

    router.put('/users/:id', [auth, adminAuth], async (req, res) => {
        const { elo, unlockedCharacters, hoyo, primogems } = req.body;
        try {
            let user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ msg: 'User not found' });
            }
            user.elo = elo;
            user.unlockedCharacters = unlockedCharacters;
            user.hoyo = hoyo;
            user.primogems = primogems;
            
            await user.save();
            res.json(user);
        } catch (err) {
            res.status(500).send('Server Error');
        }
    });


    // --- Character Routes ---
    router.post('/add-character', [auth, adminAuth], async (req, res) => {
        const { id, name } = req.body;
        if (!id || !name) {
            return res.status(400).json({ msg: 'Please provide an ID and Name' });
        }
        try {
            let char = await Character.findOne({ id: id });
            if (char) {
                return res.status(400).json({ msg: 'Character ID already exists' });
            }
            
            // Default skills now include empty icon fields implicitly via schema
            const defaultSkills = [
                { name: "New Skill 1", cost: {}, cooldown: 0, description: "Desc.", skillClass: 'Physical', executionType: 'Instant', instantActions: [] },
                { name: "New Skill 2", cost: {}, cooldown: 0, description: "Desc.", skillClass: 'Physical', executionType: 'Instant', instantActions: [] },
                { name: "New Skill 3", cost: {}, cooldown: 0, description: "Desc.", skillClass: 'Physical', executionType: 'Instant', instantActions: [] },
                { name: "New Skill 4", cost: {}, cooldown: 0, description: "Desc.", skillClass: 'Physical', executionType: 'Instant', instantActions: [] }
            ];
            
            char = new Character({
                id: id,
                name: name,
                description: "No description set.", 
                skills: defaultSkills,
                categories: [] 
            });
            await char.save();
            
            masterCharacterList[char.id] = char.toObject(); 
            res.status(201).json(char);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    router.get('/characters', [auth, adminAuth], async (req, res) => {
        try {
            res.json(Object.values(masterCharacterList));
        } catch (err) {
            res.status(500).send('Server Error');
        }
    });

    router.put('/characters/:id', [auth, adminAuth], async (req, res) => {
        // --- UPDATED: Destructure new image fields ---
        const { name, description, skills, passiveEffects, categories, icon, splashArt } = req.body; 
        try {
            const updatedChar = await Character.findOneAndUpdate(
                { id: req.params.id }, 
                // --- UPDATED: Save image fields ---
                { $set: { name, description, skills, passiveEffects, categories, icon, splashArt } }, 
                { new: true } 
            ).lean(); 
            
            if (!updatedChar) {
                return res.status(404).json({ msg: 'Character not found' });
            }
            masterCharacterList[updatedChar.id] = updatedChar; 
            res.json(updatedChar); 
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.delete('/characters/:id', [auth, adminAuth], async (req, res) => {
        try {
            const charId = req.params.id;
            const char = await Character.findOne({ id: charId });
            
            if (!char) {
                return res.status(404).json({ msg: 'Character not found' });
            }

            await char.deleteOne();
            
            if (masterCharacterList[charId]) {
                delete masterCharacterList[charId];
            }
            
            res.json({ msg: `Character ${charId} deleted successfully.` });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    // --- Effect CRUD Routes ---
    
    router.get('/effects', [auth, adminAuth], async (req, res) => {
        try {
            res.json(Object.values(masterEffectList).sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.post('/effects', [auth, adminAuth], async (req, res) => {
        try {
            const newEffect = new Effect(req.body);
            await newEffect.save();
            
            masterEffectList[newEffect.name] = newEffect.toObject(); 
            res.status(201).json(newEffect);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.put('/effects/:id', [auth, adminAuth], async (req, res) => {
        try {
            const updatedEffect = await Effect.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { new: true }
            ).lean(); 
            
            if (!updatedEffect) {
                return res.status(404).json({ msg: 'Effect not found' });
            }
            Object.keys(masterEffectList).forEach(key => {
                if (masterEffectList[key]._id.toString() === updatedEffect._id.toString()) {
                    delete masterEffectList[key];
                }
            });
            masterEffectList[updatedEffect.name] = updatedEffect; 
            
            res.json(updatedEffect);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.delete('/effects/:id', [auth, adminAuth], async (req, res) => {
        try {
            const effect = await Effect.findById(req.params.id);
            if (!effect) {
                return res.status(404).json({ msg: 'Effect not found' });
            }
            await effect.deleteOne();
            delete masterEffectList[effect.name]; 
            res.json({ msg: 'Effect deleted' });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // --- Stats Route ---
    router.get('/stats', [auth, adminAuth], async (req, res) => {
        try {
            const matches = await GameMatch.find().lean(); 
            const allCharIds = Object.keys(masterCharacterList);
            let stats = {};
            
            allCharIds.forEach(id => {
                stats[id] = {
                    id: id,
                    name: masterCharacterList[id].name,
                    totalUses: 0,
                    rankedUses: 0,
                    unrankedUses: 0,
                    rankedWins: 0,
                    unrankedWins: 0
                };
            });

            matches.forEach(match => {
                const winnerId = match.winnerId ? match.winnerId.toString() : null;
                const isRanked = match.isRanked;
                
                const player1 = match.player1;
                const player2 = match.player2;

                const team1Won = winnerId && player1.userId && winnerId === player1.userId.toString();
                const team2Won = winnerId && player2.userId && winnerId === player2.userId.toString();

                (player1.characters || []).forEach(charId => {
                    if (stats[charId]) {
                        stats[charId].totalUses++;
                        if (isRanked) stats[charId].rankedUses++;
                        else stats[charId].unrankedUses++;
                        
                        if (team1Won) {
                            if (isRanked) stats[charId].rankedWins++;
                            else stats[charId].unrankedWins++;
                        }
                    }
                });
                
                (player2.characters || []).forEach(charId => {
                    if (stats[charId]) {
                        stats[charId].totalUses++;
                        if (isRanked) stats[charId].rankedUses++;
                        else stats[charId].unrankedUses++;

                        if (team2Won) {
                            if (isRanked) stats[charId].rankedWins++;
                            else stats[charId].unrankedWins++;
                        }
                    }
                });
            });

            const statsArray = Object.values(stats).map(s => {
                const totalWins = s.rankedWins + s.unrankedWins;
                return {
                    ...s,
                    rankedWinRate: (s.rankedUses > 0) ? (s.rankedWins / s.rankedUses) : 0,
                    unrankedWinRate: (s.unrankedUses > 0) ? (s.unrankedWins / s.unrankedUses) : 0,
                    totalWinRate: (s.totalUses > 0) ? (totalWins / s.totalUses) : 0
                };
            });
            res.json(statsArray);
        } catch (err) {
            console.error("Error fetching stats:", err);
            res.status(500).send('Server Error');
        }
    });

    // --- Mission CRUD Routes ---
    router.get('/missions', [auth, adminAuth], async (req, res) => {
        try {
            const missions = await Mission.find().sort({ _id: -1 }).lean();
            res.json(missions);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    router.post('/missions', [auth, adminAuth], async (req, res) => {
        try {
            const newMission = new Mission(req.body);
            await newMission.save();
            res.status(201).json(newMission);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    router.put('/missions/:id', [auth, adminAuth], async (req, res) => {
        try {
            const updatedMission = await Mission.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { new: true }
            ).lean();
            if (!updatedMission) {
                return res.status(404).json({ msg: 'Mission not found' });
            }
            res.json(updatedMission);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    router.delete('/missions/:id', [auth, adminAuth], async (req, res) => {
        try {
            const mission = await Mission.findById(req.params.id);
            if (!mission) {
                return res.status(404).json({ msg: 'Mission not found' });
            }
            const UserMission = require('../models/UserMission'); 
            await UserMission.deleteMany({ missionId: mission.missionId });
            
            await mission.deleteOne();
            res.json({ msg: 'Mission deleted' });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    // --- Shop CRUD Routes ---
    router.get('/shop-items', [auth, adminAuth], async (req, res) => {
        try {
            const items = await ShopItem.find().sort({ _id: -1 }).lean();
            res.json(items);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.post('/shop-items', [auth, adminAuth], async (req, res) => {
        try {
            const newItem = new ShopItem(req.body);
            await newItem.save();
            res.status(201).json(newItem);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.put('/shop-items/:id', [auth, adminAuth], async (req, res) => {
        try {
            const updatedItem = await ShopItem.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { new: true }
            ).lean();
            if (!updatedItem) {
                return res.status(404).json({ msg: 'Shop item not found' });
            }
            res.json(updatedItem);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.delete('/shop-items/:id', [auth, adminAuth], async (req, res) => {
        try {
            const item = await ShopItem.findById(req.params.id);
            if (!item) {
                return res.status(404).json({ msg: 'Shop item not found' });
            }
            await item.deleteOne();
            res.json({ msg: 'Shop item deleted' });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    // --- GACHA CRUD ROUTES ---
    
    router.get('/gacha-banners', [auth, adminAuth], async (req, res) => {
        try {
            res.json(Object.values(masterGachaBanners));
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.post('/gacha-banners', [auth, adminAuth], async (req, res) => {
        try {
            const newBanner = new GachaBanner(req.body);
            await newBanner.save();
            
            masterGachaBanners[newBanner.bannerId] = newBanner.toObject(); 
            res.status(201).json(newBanner);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.put('/gacha-banners/:id', [auth, adminAuth], async (req, res) => {
        try {
            const { name, cost, currency, rules, rarities, pity } = req.body;
            
            const updatedBanner = await GachaBanner.findByIdAndUpdate(
                req.params.id,
                { $set: { name, cost, currency, rules, rarities, pity } },
                { new: true }
            ).lean(); 
            
            if (!updatedBanner) {
                return res.status(404).json({ msg: 'Banner not found' });
            }
            masterGachaBanners[updatedBanner.bannerId] = updatedBanner; 
            res.json(updatedBanner);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    router.delete('/gacha-banners/:id', [auth, adminAuth], async (req, res) => {
        try {
            const banner = await GachaBanner.findById(req.params.id);
            if (!banner) {
                return res.status(404).json({ msg: 'Banner not found' });
            }
            await banner.deleteOne();
            delete masterGachaBanners[banner.bannerId]; 
            res.json({ msg: 'Gacha banner deleted' });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    return router;
};