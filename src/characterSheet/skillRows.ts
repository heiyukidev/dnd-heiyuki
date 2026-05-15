/** PHB-style skill list order for the **Character sheet** UI. */
export const SKILL_ROWS: ReadonlyArray<{
  key:
    | 'acrobatics'
    | 'animalHandling'
    | 'arcana'
    | 'athletics'
    | 'deception'
    | 'history'
    | 'insight'
    | 'intimidation'
    | 'investigation'
    | 'medicine'
    | 'nature'
    | 'perception'
    | 'performance'
    | 'persuasion'
    | 'religion'
    | 'sleightOfHand'
    | 'stealth'
    | 'survival'
  label: string
}> = [
  { key: 'acrobatics', label: 'Acrobatics (Dex)' },
  { key: 'animalHandling', label: 'Animal Handling (Wis)' },
  { key: 'arcana', label: 'Arcana (Int)' },
  { key: 'athletics', label: 'Athletics (Str)' },
  { key: 'deception', label: 'Deception (Cha)' },
  { key: 'history', label: 'History (Int)' },
  { key: 'insight', label: 'Insight (Wis)' },
  { key: 'intimidation', label: 'Intimidation (Cha)' },
  { key: 'investigation', label: 'Investigation (Int)' },
  { key: 'medicine', label: 'Medicine (Wis)' },
  { key: 'nature', label: 'Nature (Int)' },
  { key: 'perception', label: 'Perception (Wis)' },
  { key: 'performance', label: 'Performance (Cha)' },
  { key: 'persuasion', label: 'Persuasion (Cha)' },
  { key: 'religion', label: 'Religion (Int)' },
  { key: 'sleightOfHand', label: 'Sleight of Hand (Dex)' },
  { key: 'stealth', label: 'Stealth (Dex)' },
  { key: 'survival', label: 'Survival (Wis)' },
]

export const ABILITY_ROWS: ReadonlyArray<{
  key: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
  label: string
}> = [
  { key: 'str', label: 'Strength' },
  { key: 'dex', label: 'Dexterity' },
  { key: 'con', label: 'Constitution' },
  { key: 'int', label: 'Intelligence' },
  { key: 'wis', label: 'Wisdom' },
  { key: 'cha', label: 'Charisma' },
]
