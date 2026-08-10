# Boon catalog (God catalog v1)

Design table for the five **Gods** × seven **Boons**. Not inlined in `CONTEXT.md` — implement from this file.

**Balance notes**

- Fight: **300** **Life total** baseline (**MATCH_LIFE_CAP**); **Vitality** `300 + Vitality × 3`; 60s cap; baseline auto-battler DPS ≈ 4.
- Hermes: short **Cooldown**, lower potency, same ≈4 DPS band.
- Ares: long **Cooldown**, very high potency, spiky ≈4–4.7 DPS.
- Apollo / Athena: sustain ≈55–70% of mono damage when stacked.
- Zeus: mid-tempo damage ≈4 DPS plus stronger **Passive** leverage.
- Shapes: **2** weapon-gated primary-fire (**Required Weapon type**) + **1** neutral primary-fire + **4** other (**Passive**-only / hybrid / extra neutrals).
- **Passive** filters may use **effect kind** and/or **God** and/or **Weapon type** (AND when more than one); **Weapon type** gates on the carrier’s equipped **Weapon**. **Draft** omits a **Boon** from offers when that gate does not match the drafting seat’s **Weapon**, or when **Required Weapon type** does not match.

**God weapon affiliations**

| God | Affiliations |
| --- | --- |
| Hermes | Spear, Sword |
| Ares | Axe, Sword |
| Apollo | Wand, Bow |
| Athena | Axe, Spear |
| Zeus | Wand, Bow |

---

## Hermes — swiftness

| Key | Name | Shape | Fire | Passive / gate |
|-----|------|-------|------|----------------|
| `hermes_winged_needle` | Winged Needle | fire-only | damage 4 / 1.0s | **Required Spear** |
| `hermes_dash_cut` | Dash Cut | fire-only | damage 7 / 1.6s | **Required Sword** |
| `hermes_quicksilver_jab` | Quicksilver Jab | fire-only | damage 5 / 1.2s | — |
| `hermes_messengers_sting` | Messenger's Sting | Passive-only | — | own · God Hermes · damage · **+2** flat potency |
| `hermes_fleet_foot` | Fleet Foot | hybrid | damage 5 / 1.5s | own · God Hermes · damage · **Sword** · **−10% Cooldown** |
| `hermes_slipstream` | Slipstream | Passive-only | — | own · God Hermes · **−18% Cooldown** |
| `hermes_stolen_seconds` | Stolen Seconds | Passive-only | — | own · damage · **Spear** · **−15% Cooldown** |

## Ares — war

| Key | Name | Shape | Fire | Passive / gate |
|-----|------|-------|------|----------------|
| `ares_blood_surge` | Blood Surge | fire-only | damage 22 / 5.0s | **Required Axe** |
| `ares_siege_break` | Siege Break | fire-only | damage 28 / 6.5s | **Required Sword** |
| `ares_crushing_blow` | Crushing Blow | fire-only | damage 36 / 8.0s | — |
| `ares_war_crush` | War Crush | Passive-only | — | own · God Ares · damage · **+3** flat potency |
| `ares_bloodlust` | Bloodlust | hybrid | damage 20 / 5.5s | own · God Ares · damage · **+4** flat potency |
| `ares_war_ground` | War Ground | Passive-only | — | own · God Ares · **Axe** · **+15%** potency |
| `ares_rising_fury` | Rising Fury | Passive-only | — | own · damage · **+3** flat potency |

## Apollo — healing

| Key | Name | Shape | Fire | Passive / gate |
|-----|------|-------|------|----------------|
| `apollo_sun_balm` | Sun Balm | fire-only | heal 7 / 2.0s | **Required Wand** |
| `apollo_purifying_light` | Purifying Light | fire-only | heal 11 / 3.0s | **Required Bow** |
| `apollo_healers_hand` | Healer's Hand | fire-only | heal 16 / 4.5s | — |
| `apollo_paean` | Paean | Passive-only | — | own · God Apollo · heal · **+4** flat potency |
| `apollo_vital_bloom` | Vital Bloom | hybrid | heal 8 / 2.5s | own · heal · **+3** flat potency |
| `apollo_solar_grace` | Solar Grace | Passive-only | — | own · God Apollo · **−25% Cooldown** |
| `apollo_radiant_overflow` | Radiant Overflow | Passive-only | — | own · heal · **Wand** · **+5** flat potency |

## Athena — aegis

| Key | Name | Shape | Fire | Passive / gate |
|-----|------|-------|------|----------------|
| `athena_aegis_chip` | Aegis Chip | fire-only | shield 8 / 2.5s | **Required Spear** |
| `athena_bronze_guard` | Bronze Guard | fire-only | shield 14 / 3.5s | **Required Axe** |
| `athena_tower_ward` | Tower Ward | fire-only | shield 19 / 5.0s | — |
| `athena_parthenon` | Parthenon | Passive-only | — | own · God Athena · shield · **+4** flat potency |
| `athena_reflective_plate` | Reflective Plate | hybrid | shield 11 / 3.5s | own · God Athena · shield · **+3** flat potency |
| `athena_phalanx` | Phalanx | Passive-only | — | own · God Athena · **−25% Cooldown** |
| `athena_bastion_doctrine` | Bastion Doctrine | Passive-only | — | own · shield · **+5** flat potency |

## Zeus — lightning

| Key | Name | Shape | Fire | Passive / gate |
|-----|------|-------|------|----------------|
| `zeus_spark_arc` | Spark Arc | fire-only | damage 10 / 2.5s | **Required Wand** |
| `zeus_chain_bolt` | Chain Bolt | fire-only | damage 12 / 3.0s | **Required Bow** |
| `zeus_thunderclap` | Thunderclap | fire-only | damage 14 / 3.5s | — |
| `zeus_skyfall` | Skyfall | Passive-only | — | own · God Zeus · damage · **+3** flat potency |
| `zeus_storm_crown` | Storm Crown | hybrid | damage 11 / 3.0s | own · God Zeus · damage · **+10%** potency |
| `zeus_olympian_tempo` | Olympian Tempo | Passive-only | — | own · God Zeus · **−20% Cooldown** |
| `zeus_thunder_tyrant` | Thunder Tyrant | Passive-only | — | enemy · damage · **+15% Cooldown** (slows their damage) |
