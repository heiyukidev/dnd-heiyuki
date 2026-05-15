<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { cloneDeep, concat, debounce, filter } from 'lodash'
import type { Id } from '../../convex/_generated/dataModel'
import { api } from '../../convex/_generated/api'
import {
  createDefaultSheet,
  hydrateSheetFromServer,
  type CharacterSheetForm,
} from '../characterSheet/defaults'
import { ABILITY_ROWS, SKILL_ROWS } from '../characterSheet/skillRows'
import { useConvexClient } from '../composables/convexClient'
import { useConvexQuery } from '../composables/useConvexQuery'

const props = defineProps<{
  sessionId: Id<'sessions'>
  characterId: Id<'sessionCharacters'>
}>()

const emit = defineEmits<{
  saveError: [message: string]
}>()

const client = useConvexClient()

const { data: bundle, error: bundleError } = useConvexQuery(
  client,
  api.sessions.getSessionCharacterSheetForViewer,
  () => ({ sessionId: props.sessionId, characterId: props.characterId }),
)

const draft = reactive({
  name: '',
  hp: 0,
  maxHp: 0,
  sheet: createDefaultSheet() as CharacterSheetForm,
})

function abilityRef(key: keyof CharacterSheetForm['abilities']) {
  return draft.sheet.abilities[key]!
}

function saveRef(key: keyof CharacterSheetForm['saves']) {
  return draft.sheet.saves[key]!
}

function skillRef(key: keyof CharacterSheetForm['skills']) {
  return draft.sheet.skills[key]!
}

const localDirty = ref(false)
const saveError = ref<string | null>(null)

function hydrateFromBundle() {
  const b = bundle.value
  if (!b) {
    return
  }
  draft.name = b.character.name
  draft.hp = b.character.stats.hp
  draft.maxHp = b.character.stats.maxHp
  draft.sheet = hydrateSheetFromServer(b.character.sheet)
}

const canEdit = computed(() => bundle.value?.canEdit === true)

const viewerIsDm = computed(() => bundle.value?.viewerRole === 'dm')

const canEditClassLevels = computed(() => canEdit.value === true && viewerIsDm.value === true)

function addClassLevelRow() {
  if (!canEditClassLevels.value) {
    return
  }
  draft.sheet.classLevels = concat(draft.sheet.classLevels, [{ class: '', level: 1 }])
  touch()
}

function removeClassLevelRow(index: number) {
  if (!canEditClassLevels.value) {
    return
  }
  draft.sheet.classLevels = filter(draft.sheet.classLevels, (_, i) => i !== index)
  touch()
}

const scheduleSave = debounce(async () => {
  saveError.value = null
  if (!canEdit.value) {
    return
  }
  const hp = Math.min(99999, Math.max(0, Math.floor(Number(draft.hp)) || 0))
  const maxHp = Math.min(99999, Math.max(0, Math.floor(Number(draft.maxHp)) || 0))
  draft.hp = hp
  draft.maxHp = maxHp
  try {
    await client.mutation(api.sessions.patchSessionCharacterSheet, {
      sessionId: props.sessionId,
      characterId: props.characterId,
      name: draft.name.trim(),
      stats: { hp: draft.hp, maxHp: draft.maxHp },
      sheetPatch: cloneDeep(draft.sheet),
    })
    localDirty.value = false
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not save sheet.'
    saveError.value = msg
    emit('saveError', msg)
  }
}, 450)

function touch() {
  if (!canEdit.value) {
    return
  }
  localDirty.value = true
  scheduleSave()
}

watch(
  () => bundle.value,
  (b) => {
    if (!b) {
      return
    }
    if (localDirty.value) {
      return
    }
    hydrateFromBundle()
  },
  { immediate: true },
)

watch(
  () => props.characterId,
  () => {
    scheduleSave.cancel()
    localDirty.value = false
    if (bundle.value) {
      hydrateFromBundle()
    }
  },
)

onBeforeUnmount(() => {
  scheduleSave.flush()
})
</script>

<template>
  <div class="cs-root thin-scroll">
    <p v-if="bundleError" class="error">
      Could not load character sheet. {{ bundleError.message }}
    </p>
    <p v-else-if="bundle === undefined" class="muted">Loading sheet…</p>
    <p v-else-if="bundle === null" class="muted">You cannot view this character.</p>
    <template v-else>
      <p v-if="saveError" class="error tiny">{{ saveError }}</p>
      <p v-if="!canEdit" class="muted tiny read-only-banner">Read-only (session not live).</p>

      <section class="cs-section">
        <h3 class="cs-heading">Identity</h3>
        <div class="cs-grid cs-grid--2">
          <label class="cs-field">
            <span class="cs-label">Character name</span>
            <input
              v-model="draft.name"
              class="input"
              type="text"
              maxlength="64"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <div class="cs-field cs-field--wide">
            <span class="cs-label">Classes &amp; levels</span>
            <p v-if="canEdit && !viewerIsDm" class="muted tiny">
              Dungeon Master sets classes; you can view them here.
            </p>
            <div class="cs-class-list">
              <div
                v-for="(row, index) in draft.sheet.classLevels"
                :key="index"
                class="cs-class-row"
              >
                <input
                  v-model="row.class"
                  class="input"
                  type="text"
                  maxlength="64"
                  placeholder="Class"
                  :disabled="!canEditClassLevels"
                  @input="touch"
                />
                <input
                  v-model.number="row.level"
                  class="input cs-class-level"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  :disabled="!canEditClassLevels"
                  @input="touch"
                />
                <button
                  v-if="canEditClassLevels"
                  type="button"
                  class="cs-icon-btn"
                  aria-label="Remove class row"
                  @click="removeClassLevelRow(index)"
                >
                  ×
                </button>
              </div>
              <button
                v-if="canEditClassLevels"
                type="button"
                class="cs-link-btn"
                @click="addClassLevelRow"
              >
                Add class
              </button>
            </div>
          </div>
          <label class="cs-field">
            <span class="cs-label">Background</span>
            <input
              v-model="draft.sheet.background"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Player name</span>
            <input
              v-model="draft.sheet.playerName"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Race</span>
            <input
              v-model="draft.sheet.race"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Alignment</span>
            <input
              v-model="draft.sheet.alignment"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Experience points</span>
            <input
              v-model="draft.sheet.experiencePoints"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
        </div>
      </section>

      <section class="cs-section">
        <h3 class="cs-heading">Combat</h3>
        <div class="cs-grid cs-grid--3">
          <label class="cs-field">
            <span class="cs-label">Armor class</span>
            <input
              v-model="draft.sheet.armorClass"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Initiative</span>
            <input
              v-model="draft.sheet.initiative"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Speed</span>
            <input
              v-model="draft.sheet.speed"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
        </div>
        <div class="cs-grid cs-grid--3 cs-tight">
          <label class="cs-field">
            <span class="cs-label">Current hit points</span>
            <input
              v-model.number="draft.hp"
              class="input"
              type="number"
              min="0"
              max="99999"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Max hit points</span>
            <input
              v-model.number="draft.maxHp"
              class="input"
              type="number"
              min="0"
              max="99999"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Hit dice</span>
            <input
              v-model="draft.sheet.hitDice"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
        </div>
        <div class="cs-row cs-row--wrap">
          <label class="cs-inline">
            <input
              v-model="draft.sheet.inspiration"
              type="checkbox"
              :disabled="!canEdit"
              @change="touch"
            />
            <span>Inspiration</span>
          </label>
          <label class="cs-field cs-field--narrow">
            <span class="cs-label">Proficiency bonus</span>
            <input
              v-model="draft.sheet.proficiencyBonus"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field cs-field--narrow">
            <span class="cs-label">Passive perception</span>
            <input
              v-model="draft.sheet.passivePerception"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
        </div>
        <div class="cs-death">
          <span class="cs-label">Death saves</span>
          <div class="cs-death-grid">
            <span class="tiny muted">Successes</span>
            <label class="cs-inline"
              ><input
                v-model="draft.sheet.deathSaveSuccess1"
                type="checkbox"
                :disabled="!canEdit"
                @change="touch"
            /></label>
            <label class="cs-inline"
              ><input
                v-model="draft.sheet.deathSaveSuccess2"
                type="checkbox"
                :disabled="!canEdit"
                @change="touch"
            /></label>
            <label class="cs-inline"
              ><input
                v-model="draft.sheet.deathSaveSuccess3"
                type="checkbox"
                :disabled="!canEdit"
                @change="touch"
            /></label>
            <span class="tiny muted">Failures</span>
            <label class="cs-inline"
              ><input
                v-model="draft.sheet.deathSaveFail1"
                type="checkbox"
                :disabled="!canEdit"
                @change="touch"
            /></label>
            <label class="cs-inline"
              ><input
                v-model="draft.sheet.deathSaveFail2"
                type="checkbox"
                :disabled="!canEdit"
                @change="touch"
            /></label>
            <label class="cs-inline"
              ><input
                v-model="draft.sheet.deathSaveFail3"
                type="checkbox"
                :disabled="!canEdit"
                @change="touch"
            /></label>
          </div>
        </div>
      </section>

      <div class="cs-columns">
        <section class="cs-section">
          <h3 class="cs-heading">Abilities</h3>
          <div class="cs-ability-head">
            <span></span>
            <span class="tiny muted">Score</span>
            <span class="tiny muted">Mod</span>
          </div>
          <div v-for="row in ABILITY_ROWS" :key="row.key" class="cs-ability-row">
            <span class="cs-ability-label">{{ row.label }}</span>
            <input
              v-model="abilityRef(row.key).score"
              class="input input-narrow"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
            <input
              v-model="abilityRef(row.key).mod"
              class="input input-narrow"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </div>
        </section>

        <section class="cs-section">
          <h3 class="cs-heading">Saving throws</h3>
          <div v-for="row in ABILITY_ROWS" :key="`save-${row.key}`" class="cs-save-row">
            <label class="cs-inline">
              <input
                v-model="saveRef(row.key).prof"
                type="checkbox"
                :disabled="!canEdit"
                @change="touch"
              />
            </label>
            <span class="cs-save-label">{{ row.label }}</span>
            <input
              v-model="saveRef(row.key).mod"
              class="input input-narrow"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </div>
        </section>
      </div>

      <section class="cs-section">
        <h3 class="cs-heading">Skills</h3>
        <div class="cs-skill-table">
          <div v-for="row in SKILL_ROWS" :key="row.key" class="cs-skill-row">
            <label class="cs-inline">
              <input
                v-model="skillRef(row.key).prof"
                type="checkbox"
                :disabled="!canEdit"
                @change="touch"
              />
            </label>
            <span class="cs-skill-label">{{ row.label }}</span>
            <input
              v-model="skillRef(row.key).mod"
              class="input input-narrow"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </div>
        </div>
      </section>

      <section class="cs-section">
        <h3 class="cs-heading">Proficiencies &amp; languages</h3>
        <textarea
          v-model="draft.sheet.proficienciesLanguages"
          class="input cs-textarea"
          rows="4"
          :disabled="!canEdit"
          @input="touch"
        />
      </section>

      <section class="cs-section">
        <h3 class="cs-heading">Attacks &amp; spellcasting</h3>
        <textarea
          v-model="draft.sheet.attacksSpellcasting"
          class="input cs-textarea"
          rows="5"
          :disabled="!canEdit"
          @input="touch"
        />
      </section>

      <section class="cs-section">
        <h3 class="cs-heading">Equipment &amp; currency</h3>
        <div class="cs-grid cs-grid--5 cs-tight">
          <label class="cs-field">
            <span class="cs-label">CP</span>
            <input
              v-model="draft.sheet.currencyCp"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">SP</span>
            <input
              v-model="draft.sheet.currencySp"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">EP</span>
            <input
              v-model="draft.sheet.currencyEp"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">GP</span>
            <input
              v-model="draft.sheet.currencyGp"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">PP</span>
            <input
              v-model="draft.sheet.currencyPp"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
        </div>
        <textarea
          v-model="draft.sheet.equipment"
          class="input cs-textarea"
          rows="6"
          :disabled="!canEdit"
          @input="touch"
        />
      </section>

      <section class="cs-section">
        <h3 class="cs-heading">Personality</h3>
        <label class="cs-field">
          <span class="cs-label">Traits</span>
          <textarea
            v-model="draft.sheet.personalityTraits"
            class="input cs-textarea"
            rows="3"
            :disabled="!canEdit"
            @input="touch"
          />
        </label>
        <label class="cs-field">
          <span class="cs-label">Ideals</span>
          <textarea
            v-model="draft.sheet.ideals"
            class="input cs-textarea"
            rows="3"
            :disabled="!canEdit"
            @input="touch"
          />
        </label>
        <label class="cs-field">
          <span class="cs-label">Bonds</span>
          <textarea
            v-model="draft.sheet.bonds"
            class="input cs-textarea"
            rows="3"
            :disabled="!canEdit"
            @input="touch"
          />
        </label>
        <label class="cs-field">
          <span class="cs-label">Flaws</span>
          <textarea
            v-model="draft.sheet.flaws"
            class="input cs-textarea"
            rows="3"
            :disabled="!canEdit"
            @input="touch"
          />
        </label>
      </section>

      <section class="cs-section">
        <h3 class="cs-heading">Features &amp; traits</h3>
        <textarea
          v-model="draft.sheet.featuresAndTraits"
          class="input cs-textarea"
          rows="8"
          :disabled="!canEdit"
          @input="touch"
        />
      </section>

      <section class="cs-section">
        <h3 class="cs-heading">Spellcasting</h3>
        <div class="cs-grid cs-grid--3">
          <label class="cs-field">
            <span class="cs-label">Spellcasting class</span>
            <input
              v-model="draft.sheet.spellcastingClass"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Spell save DC</span>
            <input
              v-model="draft.sheet.spellSaveDc"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
          <label class="cs-field">
            <span class="cs-label">Spell attack bonus</span>
            <input
              v-model="draft.sheet.spellAttackBonus"
              class="input"
              type="text"
              :disabled="!canEdit"
              @input="touch"
            />
          </label>
        </div>
        <label class="cs-field">
          <span class="cs-label">Cantrips</span>
          <textarea
            v-model="draft.sheet.cantrips"
            class="input cs-textarea"
            rows="4"
            :disabled="!canEdit"
            @input="touch"
          />
        </label>
        <label class="cs-field">
          <span class="cs-label">Spells prepared / known</span>
          <textarea
            v-model="draft.sheet.spellsPrepared"
            class="input cs-textarea"
            rows="6"
            :disabled="!canEdit"
            @input="touch"
          />
        </label>
        <label class="cs-field">
          <span class="cs-label">Spell slots &amp; notes</span>
          <textarea
            v-model="draft.sheet.spellSlots"
            class="input cs-textarea"
            rows="6"
            :disabled="!canEdit"
            @input="touch"
          />
        </label>
      </section>
    </template>
  </div>
</template>

<style scoped>
.cs-root {
  overflow: visible;
  padding-right: 0;
}
.cs-section {
  margin-bottom: 1.25rem;
}
.cs-heading {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted, #888);
}
.cs-grid {
  display: grid;
  gap: 0.5rem 0.75rem;
}
.cs-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.cs-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.cs-grid--5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
.cs-tight {
  margin-top: 0.5rem;
}
.cs-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.cs-field--narrow {
  max-width: 160px;
}
.cs-field--wide {
  grid-column: 1 / -1;
}
.cs-class-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.cs-class-row {
  display: grid;
  grid-template-columns: 1fr 72px 28px;
  gap: 0.35rem;
  align-items: center;
}
.cs-class-level {
  max-width: 72px;
}
.cs-icon-btn {
  border: 1px solid var(--border, #444);
  background: transparent;
  color: inherit;
  line-height: 1;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
}
.cs-icon-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}
.cs-link-btn {
  align-self: flex-start;
  margin-top: 0.15rem;
  padding: 0.2rem 0;
  border: none;
  background: none;
  color: var(--accent, #7ab8ff);
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: underline;
}
.cs-link-btn:hover {
  opacity: 0.85;
}
.cs-label {
  font-size: 0.75rem;
  color: var(--muted, #888);
}
.cs-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}
.cs-row--wrap {
  flex-wrap: wrap;
}
.cs-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
}
.cs-textarea {
  width: 100%;
  resize: vertical;
  font-family: inherit;
}
.cs-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
@media (max-width: 720px) {
  .cs-columns {
    grid-template-columns: 1fr;
  }
  .cs-grid--2,
  .cs-grid--3,
  .cs-grid--5 {
    grid-template-columns: 1fr;
  }
}
.cs-ability-head {
  display: grid;
  grid-template-columns: 1fr 64px 64px;
  gap: 0.35rem;
  margin-bottom: 0.25rem;
}
.cs-ability-row {
  display: grid;
  grid-template-columns: 1fr 64px 64px;
  gap: 0.35rem;
  align-items: center;
  margin-bottom: 0.25rem;
}
.cs-ability-label {
  font-size: 0.85rem;
}
.cs-save-row {
  display: grid;
  grid-template-columns: 28px 1fr 64px;
  gap: 0.35rem;
  align-items: center;
  margin-bottom: 0.25rem;
}
.cs-save-label {
  font-size: 0.85rem;
}
.cs-skill-table {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.cs-skill-row {
  display: grid;
  grid-template-columns: 28px 1fr 64px;
  gap: 0.35rem;
  align-items: center;
}
.cs-skill-label {
  font-size: 0.82rem;
}
.cs-death {
  margin-top: 0.75rem;
}
.cs-death-grid {
  display: grid;
  grid-template-columns: 90px repeat(3, 32px);
  gap: 0.35rem;
  align-items: center;
  margin-top: 0.35rem;
}
.read-only-banner {
  margin-bottom: 0.5rem;
}
.tiny {
  font-size: 0.75rem;
}
</style>
