const mongoose = require('mongoose');
const { MONGO_URI } = require('../config.js'); 
const Character = require('../models/character.js'); 
const Effect = require('../models/Effect.js'); 

const characterData = [
    // --- 1. Ishida Uryuu (Test: ModifySkillCost) ---
    {
        id: 'uryuu',
        name: 'Ishida Uryuu',
        description: 'A Quincy. Tests cost modification mechanics.',
        skills: [
            { 
                name: "Kojaku Shot", 
                cost: { any: 1 }, 
                cooldown: 0, 
                skillClass: 'Energy',
                executionType: 'Instant',
                instantActions: [
                    { type: 'Damage', target: 'SelectedTarget', amount: 20, damageType: 'Piercing' },
                    // Next turn costs become 1 random
                    { 
                        type: 'ApplyEffect', target: 'Self', effectName: 'Kojaku_Cost_Change', duration: 1 
                    }
                ]
            },
            { 
                name: "Energy Chain Shot", 
                cost: { green: 1 }, 
                cooldown: 0, 
                skillClass: 'Energy', 
                executionType: 'Instant',
                instantActions: [
                    { type: 'Damage', target: 'SelectedTarget', amount: 15 }, 
                    // Reduce damage taken by enemy (Debuff)
                    { type: 'SetProperty', target: 'SelectedTarget', property: 'DecreaseDamageDealt', propertyValue: 5, duration: 3 }
                ] 
            },
            { 
                name: "Heavenly Wild Puppet Suit", 
                cost: { white: 1 }, 
                cooldown: 4, 
                skillClass: 'Strategic', 
                executionType: 'Instant',
                instantActions: [
                    { type: 'SetProperty', target: 'Self', property: 'IgnoreStuns', propertyValue: true, duration: 2 }
                ] 
            },
            { 
                name: "Evasion", 
                cost: { any: 1 }, 
                cooldown: 4, 
                skillClass: 'Strategic', 
                executionType: 'Instant',
                instantActions: [
                    { type: 'SetProperty', target: 'Self', property: 'Invulnerable', propertyValue: true, duration: 1 }
                ] 
            }
        ]
    },
    // --- 2. Hirako Shinji (Test: Inverted Property) ---
    {
        id: 'shinji',
        name: 'Hirako Shinji',
        description: 'Visored Leader. Tests Invert Logic (Heal becomes Damage).',
        skills: [
            { 
                name: "Sakanade", 
                cost: { blue: 1 }, 
                cooldown: 0, 
                skillClass: 'Affliction', 
                executionType: 'Instant',
                instantActions: [
                    { type: 'Damage', target: 'SelectedTarget', amount: 20, damageType: 'Affliction' }
                ] 
            },
            { 
                name: "Inverted World", 
                cost: { red: 1, white: 1 }, 
                cooldown: 2, 
                skillClass: 'Strategic', 
                executionType: 'Instant',
                instantActions: [
                    // Apply "Inverted" property. 
                    // If an ally tries to Heal this target, they will take Damage.
                    // If an enemy tries to Damage this target, they will Heal.
                    { type: 'SetProperty', target: 'SelectedTarget', property: 'Inverted', propertyValue: true, duration: 2 } 
                ] 
            },
            { 
                name: "Cero", 
                cost: { red: 1 }, 
                cooldown: 1, 
                skillClass: 'Energy', 
                executionType: 'Instant',
                instantActions: [
                    { type: 'Damage', target: 'SelectedTarget', amount: 30, damageType: 'Energy' }
                ]
            },
            { 
                name: "Evasion", 
                cost: { any: 1 }, 
                cooldown: 4, 
                skillClass: 'Strategic', 
                executionType: 'Instant',
                instantActions: [
                    { type: 'SetProperty', target: 'Self', property: 'Invulnerable', propertyValue: true, duration: 1 }
                ] 
            }
        ]
    },
    // --- 3. Muramasa (Test: CopySkill) ---
    {
        id: 'muramasa',
        name: 'Muramasa',
        description: 'Zanpakutou Spirit. Tests Skill Copying.',
        skills: [
            { 
                name: "Zanpakutou Control", 
                cost: { any: 1 }, 
                cooldown: 0, 
                skillClass: 'Strategic', 
                executionType: 'Instant',
                instantActions: [
                    // Applies a permanent stance that listens for enemy skills
                    { type: 'ApplyEffect', target: 'Self', effectName: 'Muramasa_Copy_Stance', duration: 99 } 
                ] 
            }, 
            { name: "Slasher", cost: { red: 1 }, cooldown: 0, skillClass: 'Physical', executionType: 'Instant',
               instantActions: [{ type: 'Damage', target: 'SelectedTarget', amount: 20, damageType: 'Affliction' }] },
            { name: "Energy Wave", cost: { blue: 1 }, cooldown: 0, skillClass: 'Energy', executionType: 'Instant',
               instantActions: [{ type: 'Damage', target: 'SelectedTarget', amount: 20, damageType: 'Energy' }] },
            { name: "Dark Cero", cost: { green: 1 }, cooldown: 0, skillClass: 'Energy', executionType: 'Instant',
               instantActions: [{ type: 'Damage', target: 'SelectedTarget', amount: 20, damageType: 'Physical' }] }
        ]
    },
    // --- 4. Aizen Sousuke (Test: CounterSkill) ---
    {
        id: 'aizen',
        name: 'Aizen Sousuke',
        description: 'Former Captain. Tests Counter Mechanics.',
        skills: [
            { 
                name: "Flash Step Massacre", 
                cost: { white: 1, any: 1 }, 
                cooldown: 2, 
                skillClass: 'Physical', 
                executionType: 'Instant',
                instantActions: [
                    // Ignore Invulnerability flag test
                    { type: 'Damage', target: 'SelectedTarget', amount: 35, damageType: 'Piercing', ignoreInvuln: true }
                ] 
            },
            { 
                name: "Black Coffin", 
                cost: { blue: 1, red: 1 }, 
                cooldown: 2, 
                skillClass: 'Energy', 
                executionType: 'Instant',
                instantActions: [
                    { type: 'Damage', target: 'SelectedTarget', amount: 25, damageType: 'Piercing' }, 
                    { type: 'Stun', target: 'SelectedTarget', stunType: 'Full' }
                ] 
            },
            { 
                name: "Shatter, Kyouka Suigetsu", 
                cost: { green: 1 }, 
                cooldown: 1, 
                skillClass: 'Strategic', 
                executionType: 'Instant',
                instantActions: [
                    // Apply the Counter Stance
                    { type: 'ApplyEffect', target: 'Self', effectName: 'Aizen_Counter_Stance', duration: 1 } 
                ] 
            },
            { 
                name: "Deflection", 
                cost: { any: 1 }, 
                cooldown: 4, 
                skillClass: 'Strategic', 
                executionType: 'Instant',
                instantActions: [
                    { type: 'SetProperty', target: 'Self', property: 'Invulnerable', propertyValue: true, duration: 1 }
                ] 
            }
        ]
    },
    // --- 5. Ukitake Joushiro (Test: ReflectSkill) ---
    {
        id: 'ukitake',
        name: 'Ukitake Joushiro',
        description: 'Captain of 13th. Tests Reflect Mechanics.',
        skills: [
            {
                name: "Lightning Blade",
                cost: { green: 1 },
                cooldown: 0,
                skillClass: 'Energy',
                executionType: 'Instant',
                instantActions: [
                    { type: 'Damage', target: 'SelectedTarget', amount: 15, damageType: 'Energy' }
                ]
            },
            {
                name: "All Waves, Become my Shield",
                cost: { blue: 1 },
                cooldown: 1,
                skillClass: 'Strategic',
                executionType: 'Instant',
                instantActions: [
                    // Applies Reflect Stance
                    { type: 'ApplyEffect', target: 'Self', effectName: 'Ukitake_Reflect_Stance', duration: 1 }
                ]
            },
            { name: "Sealing Ward", cost: { white: 1 }, cooldown: 4, skillClass: 'Strategic', executionType: 'Instant',
                instantActions: [{ type: 'SetProperty', target: 'Self', property: 'DestructibleDefense', propertyValue: 30, duration: 99 }] },
            { name: "Block", cost: { any: 1 }, cooldown: 4, skillClass: 'Strategic', executionType: 'Instant',
                instantActions: [{ type: 'SetProperty', target: 'Self', property: 'Invulnerable', propertyValue: true, duration: 1 }] }
        ]
    }
];

// --- EFFECTS ---
const effectData = [
    // 1. Kojaku Cost Change
    {
        name: "Kojaku_Cost_Change",
        description: "Changes cost of skills to 1 Random.",
        maxStacks: 1,
        logicBlocks: [{
            trigger: 'OnEffectApply',
            conditions: [],
            actions: [{ type: 'ModifySkillCost', target: 'Self', costChange: { setRandom: true } }]
        }]
    },
    // 2. Muramasa Copy Stance
    {
        name: "Muramasa_Copy_Stance",
        description: "Copies the next non-strategic skill used by an enemy.",
        maxStacks: 1,
        isPermanent: true,
        logicBlocks: [
            {
                trigger: 'OnSkillUse',
                conditions: [
                    // If Caster is Enemy AND Skill is NOT Strategic
                    { field: 'Event.Caster', operator: 'IsEnemy', value: true }, 
                    { field: 'Event.Skill.Class', operator: '!=', value: 'Strategic' } 
                ],
                actions: [
                    { type: 'CopySkill', target: 'Self' }, // Copy the Event.Skill to Self
                    { type: 'RemoveEffect', target: 'Self', effectName: 'Muramasa_Copy_Stance' } // Consume stance
                ]
            }
        ]
    },
    // 3. Aizen Counter Stance
    {
        name: "Aizen_Counter_Stance",
        description: "Counters the first harmful skill used on this character.",
        maxStacks: 1,
        logicBlocks: [
            {
                trigger: 'OnTargeted', // Triggered BEFORE damage application
                conditions: [
                    { field: 'Event.Caster', operator: 'IsEnemy', value: true }, // Is Enemy
                    { field: 'Event.Target', operator: 'IsTarget', value: true }, // Targeted ME
                    { field: 'Event.Skill.Class', operator: '!=', value: 'Strategic' } // Harmful skill
                ],
                actions: [
                    { type: 'CounterSkill', target: 'Event.Caster' }, // Cancel the skill
                    { type: 'Damage', target: 'Event.Caster', amount: 30, damageType: 'Physical', ignoreInvuln: true }, // Retaliate
                    { type: 'RemoveEffect', target: 'Self', effectName: 'Aizen_Counter_Stance' } // Consume stance
                ]
            }
        ]
    },
    // 4. Ukitake Reflect Stance
    {
        name: "Ukitake_Reflect_Stance",
        description: "Reflects energy skills back to the caster.",
        maxStacks: 1,
        logicBlocks: [
            {
                trigger: 'OnTargeted', // Triggered BEFORE damage
                conditions: [
                    { field: 'Event.Caster', operator: 'IsEnemy', value: true },
                    { field: 'Event.Target', operator: 'IsTarget', value: true },
                    { field: 'Event.Skill.Class', operator: '==', value: 'Energy' } // Only Energy skills
                ],
                actions: [
                    { type: 'ReflectSkill', target: 'Event.Caster' }, // Swap target to original caster
                    { type: 'RemoveEffect', target: 'Self', effectName: 'Ukitake_Reflect_Stance' }
                ]
            }
        ]
    }
];


const seedDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for COMPLEX seeding...');

        // Clear existing test characters
        await Character.deleteMany({ id: { $in: ['uryuu', 'shinji', 'muramasa', 'aizen', 'ukitake'] } });
        // Clear existing test effects
        await Effect.deleteMany({ name: { $in: effectData.map(e => e.name) } });
        
        await Character.insertMany(characterData);
        await Effect.insertMany(effectData);
        
        console.log('Database seeded with 5 complex characters for testing!');

    } catch (err) {
        console.error('Error seeding:', err.message);
    } finally {
        mongoose.connection.close();
    }
};

seedDB();