const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- Copied ConditionSchema from Effect.js ---
const ConditionSchema = new Schema({
    field: { type: String, required: true },
    operator: {
        type: String,
        required: true,
        enum: [
            '==', '!=', '>', '>=', '<', '<=', 'HasEffect', 'DoesNotHaveEffect',
            'IsClass', 'IsNotClass', 'HasProperty', 'DoesNotHaveProperty',
            'IsCaster', 'IsNotCaster', 'IsTarget', 'IsNotTarget', 'IsAlly', 'IsEnemy',
            'IsNotAlly', 'IsNotEnemy', 
            'IsTurnNumber_Even', 'IsTurnNumber_Odd', 'IsMultipleOf',
            'LastSkillUsed', 'Caster.HasAlly', 'Caster.HasUsedSkill',
            'EffectCount' // Added for consistency with gameLogic
        ]
    },
    value: { type: Schema.Types.Mixed } 
}, { _id: false });

// --- ActionSchema ---
const ActionSchema = new Schema({
    conditions: [ConditionSchema],
    type: {
        type: String,
        required: true,
        enum: [
            'Damage', 'Heal', 'StealHealth', 'Execute', 'SetHealth', 'ModifyMaxHealth', 'DamageBasedOnStat',
            'ApplyEffect', 'RemoveEffect', 'ExtendDuration', 'ApplyDelayedEffect',
            'ModifyResource', 'ConsumeResource', 'SetResource',
            'Stun', 'IncreaseCooldown', 'ResetCooldowns', 'ModifySkillCost',
            'SetProperty', 'InvertHealing', 'InvertHelpfulHarmful',
            'IncreaseDamageDealt', 'DecreaseDamageDealt',
            'SwapSkill', 'ModifySkillTargetType', 'ModifySkillCooldown',
            'ModifySkillMechanics', 
            'ReflectSkill', 'CounterSkill', 'Transform', 'RevertForm',
            'UseSkill', 'CopySkill',
            'ExecuteBasedOnStat', 'ConvertProperty',
            'SwapHealth' 
        ]
    },
    target: { 
        type: String, 
        default: 'SelectedTarget', 
        enum: [
            'SelectedTarget', 'Self', 'AllEnemies', 'AllAllies', 'RandomEnemy', 
            'RandomAlly', 'AllAllies_ExceptSelf',
            'Event.Target', 'Event.Caster', 'Event.Effect',
            'AllAlliesAndEnemies', 'AllyOrEnemy', 'AllyTeamOrEnemyTeam'
        ]
    }, 
    
    // --- Fields ---
    amount: { type: Number }, 
    effectName: { type: String }, 
    duration: { type: Number }, 
    damageType: { type: String, enum: ['Physical', 'Energy', 'Affliction', 'Piercing'], default: 'Physical' },
    damageCategory: { type: String, enum: ['Physical', 'Energy', 'Affliction', 'NonAffliction', 'All'], default: 'All' },

    baseAmount: { type: Number }, 
    statToScale: { type: String }, 
    scaleFactor: { type: Number }, 
    resource: { type: String }, 
    stunType: { type: String, enum: ['Full', 'Physical', 'Energy', 'Strategic', 'NonStrategic'], default: 'Full' }, 
    property: { type: String }, 
    propertyValue: { type: Schema.Types.Mixed, default: true }, 
    skillToSwap: { type: String }, 
    newSkill: { type: String }, 
    delayTurns: { type: Number, default: 1 }, 
    
    sourceProperty: { type: String }, 
    targetProperty: { type: String }, 
    conversionFactor: { type: Number, default: 1.0 }, 
    removeSource: { type: Boolean, default: true },
    removeBySourceClass: { type: String },

    // --- COMPLEX MECHANICS ---
    targetSkill: { type: String }, 
    ignoreInvuln: { type: Boolean, default: false }, 
    costChange: { 
        green: { type: Number },
        blue: { type: Number },
        red: { type: Number },
        white: { type: Number },
        any: { type: Number },
        setRandom: { type: Boolean } 
    },
    newTargetType: { type: String }, 
    
    mechanics: {
        ignoreInvuln: { type: Boolean, default: false },
        uncounterable: { type: Boolean, default: false }
    },
    mode: { type: String, enum: ['Set', 'Remove'], default: 'Set' },
    
    skillProperty: { type: String }, 
    skillPropertyValue: { type: Schema.Types.Mixed }

}, { _id: false });


// --- SkillSchema ---
const SkillSchema = new Schema({
    name: { type: String, required: true },
    // *** NEW: Skill Icon ***
    icon: { type: String, default: '' },
    // -----------------------
    cost: {
        green: { type: Number, default: 0 },
        blue: { type: Number, default: 0 },
        red: { type: Number, default: 0 },
        white: { type: Number, default: 0 },
        any: { type: Number, default: 0 }
    },
    cooldown: { type: Number, required: true, default: 0 },
    description: { type: String },
    skillClass: {
        type: String,
        enum: ['Physical', 'Energy', 'Strategic', 'Affliction'], 
        default: 'Physical'
    },
    executionType: {
        type: String,
        enum: ['Instant', 'Action', 'Control'], 
        default: 'Instant'
    },
    isUnique: {
        type: Boolean,
        default: false
    },
    uncounterable: { type: Boolean, default: false },
    ignoreInvuln: { type: Boolean, default: false },
    
    targetType: {
        type: String,
        enum: [
            'Enemy', 'Ally', 'Self', 
            'AllEnemies', 'AllAllies', 'AllAlliesAndEnemies',
            'AllyOrEnemy', 'AllyTeamOrEnemyTeam'
        ],
        default: 'Enemy'
    },
    targetReqs: [ConditionSchema],
    instantActions: [ActionSchema]
    
}, { _id: false });


const CharacterSchema = new Schema({
    id: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    // *** NEW: Character Images ***
    icon: { type: String, default: '' },      // Small box image
    splashArt: { type: String, default: '' }, // Big info image
    // -----------------------------
    description: { type: String, default: 'No description set.' },
    categories: [{ type: String }], 
    skills: [SkillSchema], 
    passiveEffects: [{ type: String }] 
});

module.exports = mongoose.model('character', CharacterSchema);