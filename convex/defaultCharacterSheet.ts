import { merge } from 'lodash'

function blankAbility(): { score: string; mod: string } {
  return { score: '', mod: '' }
}

function blankSave(): { mod: string; prof: boolean } {
  return { mod: '', prof: false }
}

function blankSkill(): { mod: string; prof: boolean } {
  return { mod: '', prof: false }
}

export function createDefaultConvexSheetPayload() {
  return merge(
    {},
    {
      classLevels: [] as [],
      background: '',
      playerName: '',
      race: '',
      alignment: '',
      experiencePoints: '',
      inspiration: false,
      proficiencyBonus: '',
      passivePerception: '',
      armorClass: '',
      initiative: '',
      speed: '',
      hitDice: '',
      deathSaveSuccess1: false,
      deathSaveSuccess2: false,
      deathSaveSuccess3: false,
      deathSaveFail1: false,
      deathSaveFail2: false,
      deathSaveFail3: false,
      abilities: {
        str: blankAbility(),
        dex: blankAbility(),
        con: blankAbility(),
        int: blankAbility(),
        wis: blankAbility(),
        cha: blankAbility(),
      },
      saves: {
        str: blankSave(),
        dex: blankSave(),
        con: blankSave(),
        int: blankSave(),
        wis: blankSave(),
        cha: blankSave(),
      },
      skills: {
        acrobatics: blankSkill(),
        animalHandling: blankSkill(),
        arcana: blankSkill(),
        athletics: blankSkill(),
        deception: blankSkill(),
        history: blankSkill(),
        insight: blankSkill(),
        intimidation: blankSkill(),
        investigation: blankSkill(),
        medicine: blankSkill(),
        nature: blankSkill(),
        perception: blankSkill(),
        performance: blankSkill(),
        persuasion: blankSkill(),
        religion: blankSkill(),
        sleightOfHand: blankSkill(),
        stealth: blankSkill(),
        survival: blankSkill(),
      },
      proficienciesLanguages: '',
      attacksSpellcasting: '',
      equipment: '',
      equipmentItems: [] as [],
      equippedLoadout: {},
      currencyCp: '',
      currencySp: '',
      currencyEp: '',
      currencyGp: '',
      currencyPp: '',
      personalityTraits: '',
      ideals: '',
      bonds: '',
      flaws: '',
      featuresAndTraits: '',
      spellcastingClass: '',
      spellSaveDc: '',
      spellAttackBonus: '',
      cantrips: '',
      spellsPrepared: '',
      spellSlots: '',
    },
  ) as Record<string, unknown>
}
