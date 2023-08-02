/* eslint-disable no-unused-vars */
import fs from 'fs/promises';
import yaml from 'js-yaml';

const exists = (object) => Boolean(Object.keys(object).length);
const toLowerSnakeCaseAttr = (str) => str.replaceAll(' ', '_').toLowerCase();

const validKeys = [
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

  'condition_damage_multiplier',
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

const convert = async function () {
  const files = await fs.readdir('./data');

  const allEffectKeys = new Set();

  for (const fileName of files) {
    const fileData = await fs.readFile(`./data/${fileName}`);
    const data = yaml.load(fileData);

    const result = [];
    data.forEach(({ items }) => {
      items.forEach((item) => {
        const {
          id,
          text,
          subText,
          modifiers: { damage, attributes, conversion, conversionAfterBuffs, ...otherModifiers },
          gw2id,
          displayIds,
          ...rest
        } = item;

        exists(otherModifiers) && console.log(otherModifiers);

        let unique_effect_key = [text, subText].filter(Boolean).join(' ');

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
            let key = toLowerSnakeCaseAttr(realKey);

            const fixedKey = [];

            if (!validKeys.includes(key) && validKeys.includes(`${key}_multiplier`))
              key = `${key}_multiplier`;

            if (!validKeys.includes(key)) {
              // console.log(`invalid key`, key);
              key = 'invalid';
            }

            if (Array.isArray(value)) {
              const [amount, mode, amount2, mode2] = value;

              amount2 && console.log(amount2);

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

                default:
                  console.log([id, key, value]);
              }
            } else {
              const result = { attribute: key, addend: value };

              attribute_modifiers.push(result);
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

        const convertedItem = {
          unique_effect_key,
          gw2_id: gw2id,
          ...(attribute_modifiers.length ? { attribute_modifiers } : {}),
          ...(attribute_conversions.length ? { attribute_conversions } : {}),

          ...(exists(rest) ? { NOT_IMPLEMENTED_YET: { ...rest } } : {}),
        };

        result.push(convertedItem);
      });
    });

    const resultData = JSON.stringify(result, null, 2);

    // console.log(resultData /* .slice(0, 300) */, '\n');
    fs.writeFile(`./data2/${fileName}.json`, resultData, {
      encoding: 'utf8',
      flag: 'w+',
    });
  }
};

convert();

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
