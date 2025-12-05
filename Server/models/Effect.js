const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- ConditionSchema ---
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
            'LastSkillUsed', 'Caster.HasAlly', 'Caster.HasUsedSkill'
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
            'ModifySkillMechanics', // --- NEW ACTION TYPE
            'ReflectSkill', 'CounterSkill', 'Transform', 'RevertForm',
            'UseSkill', 'CopySkill',
            'ExecuteBasedOnStat', 'ConvertProperty'
        ]
    },
    target: { 
        type: String, 
        default: 'Event.Target', 
        enum: [
            'Event.Target', 'Event.Caster', 'Self', 'Caster', 'SelectedTarget', 
            'AllEnemies', 'AllAllies', 'RandomEnemy', 'RandomAlly', 'AllAllies_ExceptSelf',
            'Event.Effect',
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
    
    // --- NEW FIELDS FOR ModifySkillMechanics ---
    mechanics: {
        ignoreInvuln: { type: Boolean, default: false },
        uncounterable: { type: Boolean, default: false }
    },
    mode: { type: String, enum: ['Set', 'Remove'], default: 'Set' },
    // -------------------------------------------

    skillProperty: { type: String }, 
    skillPropertyValue: { type: Schema.Types.Mixed }

}, { _id: false });


// --- LogicBlockSchema ---
const LogicBlockSchema = new Schema({
    trigger: {
        type: String,
        required: true
    },
    conditions: [ConditionSchema],
    actions: [ActionSchema] 
}, { _id: false });

// --- EffectSchema ---
const EffectSchema = new Schema({
    name: { type: String, required: true, unique: true }, 
    description: { type: String, default: 'No effect description.' },
    isPermanent: { type: Boolean, default: false }, 
    isInvisible: { type: Boolean, default: false }, 
    maxStacks: { type: Number, default: 1 },
    logicBlocks: [LogicBlockSchema] 
});

module.exports = mongoose.model('effect', EffectSchema);