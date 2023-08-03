import fs from 'fs/promises';
import yaml from 'js-yaml';

const exists = (object) => object && Boolean(Object.keys(object).length);
const toLowerSnakeCaseAttr = (str) => str.replaceAll(' ', '_').toLowerCase();

const validAttributes = [
  'invalid',

  'power',
  'precision',
  'toughness',
  'vitality',
  'concentration',
  'condition_damage',
  'expertise',
  'ferocity',
  'healing_power',
  'armor',
  'max_health',

  'critical_chance_multiplier',
  'critical_damage_multiplier',

  'boon_duration_multiplier',
  'aegis_duration_multiplier',
  'alacrity_duration_multiplier',
  'fury_duration_multiplier',
  'might_duration_multiplier',
  'protection_duration_multiplier',
  'quickness_duration_multiplier',
  'regeneration_duration_multiplier',
  'resistance_duration_multiplier',
  'resolution_duration_multiplier',
  'stability_duration_multiplier',
  'swiftness_duration_multiplier',
  'vigor_duration_multiplier',

  'condition_duration_multiplier',
  'burning_duration_multiplier',
  'bleeding_duration_multiplier',
  'confusion_duration_multiplier',
  'poison_duration_multiplier',
  'torment_duration_multiplier',

  // 'condition_damage_multiplier',
  'burning_damage_multiplier',
  'bleeding_damage_multiplier',
  'confusion_damage_multiplier',
  'poison_damage_multiplier',
  'torment_damage_multiplier',

  'outgoing_strike_damage_multiplier',
  'outgoing_strike_damage_multiplier_add_group',
  'incoming_strike_damage_multiplier',
  'incoming_strike_damage_multiplier_add_group',

  'outgoing_condition_damage_multiplier',
  'outgoing_condition_damage_multiplier_add_group',
  'incoming_condition_damage_multiplier',
  'incoming_condition_damage_multiplier_add_group',
];

const fixAttribute = (realAttribute) => {
  let key = toLowerSnakeCaseAttr(realAttribute);

  if (!validAttributes.includes(key) && validAttributes.includes(`${key}_multiplier`))
    key = `${key}_multiplier`;

  if (!validAttributes.includes(key)) {
    const probablyInvalid =
      key.includes('coefficient') ||
      ['outgoing_damage_reduction', 'maximum_health', 'outgoing_healing', 'flat_dps'].includes(key);

    probablyInvalid || console.log('probably unhandled key', key);

    key = `INVALID_${key}`;
  }
  return key;
};

const lifestealSkill = {
  NOTE: 'This is a hardcoded skill name. Change only flat_damage and nothing else based on traits',
  skill_key: 'Lifesteal Proc',
  weapon_type: 'empty_handed',
  flat_damage: 325,
  cast_duration: [0, 0],
  strike_on_tick_list: [[0], [0]],
  cooldown: [2000, 2000],
  can_critical_strike: false,
};

const lifestealSkillTrigger = {
  condition: {
    threshold: {
      threshold_type: 'upper_bound_exclusive',
      threshold_value: 66,
      generate_random_number_subject_to_threshold: true,
    },
    only_applies_on_strikes: true,
    depends_on_skill_off_cooldown: 'Lifesteal Proc',
  },
  skill_key: 'Lifesteal Proc',
};

const convert = async function ({ outputSingleFiles, outputMultipleFiles }) {
  const files = (await fs.readdir('input')).filter((fileName) => fileName.endsWith('.yaml'));

  await fs.mkdir('output').catch(() => {});

  const allEffectKeys = new Set();

  for (const fileName of files) {
    const fileData = await fs.readFile(`input/${fileName}`);
    const data = yaml.load(fileData);

    const result = {};
    data.forEach(({ items }) => {
      items.forEach((item) => {
        const {
          id,
          text,
          subText,
          modifiers: { damage, attributes, conversion, conversionAfterBuffs, ...otherModifiers },
          gw2id,
          hasLifesteal,
          /* eslint-disable no-unused-vars */
          wvwModifiers,
          displayIds,
          textOverride,
          defaultEnabled,
          /* eslint-enable no-unused-vars */
          ...rest
        } = item;

        exists(otherModifiers) && console.log(otherModifiers);

        let unique_effect_key = [text, subText]
          .filter(Boolean)
          .join(' ')
          .replaceAll('/', '-')
          .replaceAll(/ \(100%.*\)/g, '');

        if (allEffectKeys.has(unique_effect_key)) {
          let count = 2;
          while (allEffectKeys.has(`${unique_effect_key}${count}`)) {
            count++;
          }
          unique_effect_key = `${unique_effect_key}-${count}`;
        }

        const attribute_modifiers = [];
        const attribute_conversions = [];

        attributes &&
          Object.entries(attributes).forEach(([realKey, value]) => {
            const key = fixAttribute(realKey);

            if (Array.isArray(value)) {
              const allPairsMut = [...value];
              while (allPairsMut.length) {
                const [realAmount, mode] = allPairsMut.splice(0, 2);

                const amount =
                  typeof realAmount === 'string' && realAmount.includes('%')
                    ? Number(realAmount.replace('%', '')) / 100
                    : realAmount;

                switch (mode) {
                  case 'converted':
                    attribute_modifiers.push({ attribute: key, addend: amount });
                    break;
                  case 'buff':
                    attribute_conversions.push({
                      from: key,
                      to: key,
                      multiplier: 0,
                      addend: amount,
                    });
                    break;

                  case 'unknown':
                    attribute_conversions.push({
                      from: key,
                      to: key,
                      multiplier: 0,
                      addend: amount,
                      UNCONFIRMED_ADD_OR_MULT: true,
                    });
                    break;

                  default:
                    console.log([id, key, value]);
                }
              }
            } else {
              const realAmount = value;

              const amount =
                typeof realAmount === 'string' && realAmount.includes('%')
                  ? Number(realAmount.replace('%', '')) / 100
                  : realAmount;

              const result = { attribute: key, addend: amount };

              attribute_modifiers.push(result);
            }
          });

        conversion &&
          Object.entries(conversion).forEach(([realKey, value]) => {
            let key = fixAttribute(realKey);

            Object.entries(value).forEach(([realSource, realAmount]) => {
              const source = fixAttribute(realSource);

              const amount =
                typeof realAmount === 'string' && realAmount.includes('%')
                  ? Number(realAmount.replace('%', '')) / 100
                  : realAmount;

              attribute_conversions.push({
                from: source,
                to: key,
                multiplier: amount,
                addend: 0,
              });
            });
          });

        damage &&
          Object.entries(damage).forEach(([realKey, value]) => {
            //
            const key = fixAttribute(
              [
                'Bleeding Damage',
                'Burning Damage',
                'Confusion Damage',
                'Poison Damage',
                'Torment Damage',
              ].includes(realKey)
                ? realKey
                : `outgoing_${realKey}`,
            );

            const allPairsMut = [...value];
            while (allPairsMut.length) {
              const [realAmount, mode] = allPairsMut.splice(0, 2);

              const amount =
                typeof realAmount === 'string' && realAmount.includes('%')
                  ? Number(realAmount.replace('%', '')) / 100
                  : realAmount;

              switch (mode) {
                case 'mult':
                  attribute_modifiers.push({ attribute: key, addend: amount });
                  break;
                case 'unknown':
                  attribute_modifiers.push({
                    attribute: key,
                    addend: amount,
                    UNCONFIRMED_ADD_OR_MULT: true,
                  });
                  break;
                case 'add':
                  attribute_modifiers.push({ attribute: `${key}_add_group`, addend: amount });

                  break;

                default:
                  console.log([id, key, value]);
              }
            }
          });

        // condition,
        // from,
        // to,
        // multiplier,
        // addend

        // unique_effect_key,
        // attribute_modifiers,
        // attribute_conversions,
        // counter_modifiers,
        // skill_triggers,
        // unchained_skill_triggers,
        // effect_removals,
        // cooldown_modifiers,
        // max_considered_stacks,
        // max_stored_stacks,
        // max_duration,
        // stacking_type

        const NOT_IMPLEMENTED = { ...rest };
        if (NOT_IMPLEMENTED.priceIds && NOT_IMPLEMENTED.priceIds.length === 0) {
          delete NOT_IMPLEMENTED.priceIds;
        }

        // exists(NOT_IMPLEMENTED) && console.log(Object.keys(NOT_IMPLEMENTED));

        const permanentUniqueEffect = {
          unique_effect_key,
          gw2_id: gw2id,
          ...(attribute_modifiers.length ? { attribute_modifiers } : {}),
          ...(attribute_conversions.length ? { attribute_conversions } : {}),

          ...(hasLifesteal ? { skill_triggers: [lifestealSkillTrigger] } : {}),

          ...(exists(NOT_IMPLEMENTED) ? { NOT_IMPLEMENTED } : {}),
          ...(exists(conversionAfterBuffs)
            ? { ALSO_NOT_IMPLEMENTED: { conversionAfterBuffs } }
            : {}),
        };

        const data = {
          counters: [],
          permanent_effects: [],
          permanent_unique_effects: [permanentUniqueEffect],
          skills: hasLifesteal ? [lifestealSkill] : [],
        };

        result[unique_effect_key] = data;
      });
    });

    if (outputSingleFiles) {
      const resultData = JSON.stringify(Object.values(result), null, 2);

      // console.log(resultData /* .slice(0, 300) */, '\n');
      fs.writeFile(`output/${fileName.replace('.yaml', '')}.json`, resultData, {
        encoding: 'utf8',
        flag: 'w+',
      });
    }

    if (outputMultipleFiles) {
      const dir = `output/${fileName.replace('.yaml', '')}`;
      await fs.mkdir(dir).catch(() => {});

      Object.entries(result).forEach(([key, value]) => {
        const entryData = JSON.stringify(value, null, 2);

        // console.log(resultData /* .slice(0, 300) */, '\n');
        fs.writeFile(`${dir}/${key}.json`, entryData, {
          encoding: 'utf8',
          flag: 'w+',
        });
      });
    }
  }
};

convert({ outputSingleFiles: true, outputMultipleFiles: true });

/*
const keyConversion = {
  'Power': null,
  'Precision': null,
  'Toughness': null,
  'Vitality': null,
  'Ferocity': null,
  'Condition Damage': null,
  'Expertise': null,
  'Concentration': null,
  'Healing Power': null,
  'Agony Resistance': null,
  //
  'Alternative Power': null,
  'Alternative Precision': null,
  'Alternative Ferocity': null,
  //
  'Critical Chance': null,
  'Boon Duration': null,
  'Aegis Duration': null,
  'Alacrity Duration': null,
  'Fury Duration': null,
  'Might Duration': null,
  'Protection Duration': null,
  'Quickness Duration': null,
  'Regeneration Duration': null,
  'Resistance Duration': null,
  'Resolution Duration': null,
  'Stability Duration': null,
  'Swiftness Duration': null,
  'Vigor Duration': null,
  'Condition Duration': null,
  'Bleeding Duration': null,
  'Burning Duration': null,
  'Confusion Duration': null,
  'Poison Duration': null,
  'Torment Duration': null,
  'Maximum Health': null,
  'Outgoing Healing': null,
  'Alternative Critical Chance': null,
  'Phantasm Critical Chance': null,
  'Clone Critical Chance': null,
  //
  'Power Coefficient': null,
  'NonCrit Power Coefficient': null,
  'Power2 Coefficient': null,
  'Bleeding Coefficient': null,
  'Burning Coefficient': null,
  'Confusion Coefficient': null,
  'Poison Coefficient': null,
  'Torment Coefficient': null,
  'Flat DPS': null,
  'Siphon Base Coefficient': null,
  //
  'Strike Damage': null,
  'Condition Damage': null,
  'All Damage': null,
  'Damage Reduction': null,
  'Critical Damage': null,
  'Bleeding Damage': null,
  'Burning Damage': null,
  'Confusion Damage': null,
  'Poison Damage': null,
  'Torment Damage': null,
  'Alternative Damage': null,
  'Alternative Critical Damage': null,
  'Phantasm Damage': null,
  'Phantasm Critical Damage': null,
};
*/
