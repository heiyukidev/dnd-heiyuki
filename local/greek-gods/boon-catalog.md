# Boon catalog (God catalog v1)

Design table for the five **Gods** × seven **Boons**. Not inlined in `CONTEXT.md` — implement from this file.

**Balance notes**

- Fight: 100 **Life total**, 60s cap; baseline auto-battler DPS ≈ 4.
- Hermes: short **Cooldown**, lower potency, same ≈4 DPS band.
- Dynamite: long **Cooldown**, very high potency, spiky ≈4–4.7 DPS.
- Hygieia / Athena: sustain ≈55–70% of mono damage when stacked.
- Zeus: mid-tempo damage ≈4 DPS plus stronger **Passive** leverage.
- Shapes: mostly **fire-only**, plus **Passive**-only / **hybrid** for kit fantasy.
- **Passive** filters may use **effect kind** and/or **God** and/or **Weapon type** (AND when more than one); **Weapon type** gates on the carrier’s equipped **Weapon**.

---

## Hermes — swiftness

| Key | Name | Shape | Fire | Passive |
|-----|------|-------|------|---------|
| `hermes_winged_needle` | Winged Needle | fire-only | damage 5 / 1.2s | — |
| `hermes_dash_cut` | Dash Cut | fire-only | damage 7 / 1.6s | — |
| `hermes_quicksilver_jab` | Quicksilver Jab | fire-only | damage 4 / 1.0s | — |
| `hermes_messengers_sting` | Messenger's Sting | fire-only | damage 9 / 2.0s | — |
| `hermes_fleet_foot` | Fleet Foot | hybrid | damage 5 / 1.5s | own · God Hermes · damage · **Sword** · **−10% Cooldown** |
| `hermes_slipstream` | Slipstream | Passive-only | — | own · God Hermes · **−18% Cooldown** |
| `hermes_stolen_seconds` | Stolen Seconds | Passive-only | — | own · damage · **Bow** · **−15% Cooldown** |

## Dynamite — destruction

| Key | Name | Shape | Fire | Passive |
|-----|------|-------|------|---------|
| `dynamite_fuse_bomb` | Fuse Bomb | fire-only | damage 22 / 5.0s | — |
| `dynamite_demolition_charge` | Demolition Charge | fire-only | damage 28 / 6.5s | — |
| `dynamite_crater` | Crater | fire-only | damage 36 / 8.0s | — |
| `dynamite_ruin` | Ruin | fire-only | damage 42 / 9.0s | — |
| `dynamite_aftershock` | Aftershock | hybrid | damage 20 / 5.5s | own · God Dynamite · damage · **+4** flat potency |
| `dynamite_scorched_earth` | Scorched Earth | Passive-only | — | own · God Dynamite · **Axe** · **+15%** potency |
| `dynamite_slow_burn` | Slow Burn | Passive-only | — | own · damage · **+3** flat potency |

## Hygieia — health

| Key | Name | Shape | Fire | Passive |
|-----|------|-------|------|---------|
| `hygieia_soft_bandage` | Soft Bandage | fire-only | heal 7 / 2.0s | — |
| `hygieia_cleanse_draught` | Cleanse Draught | fire-only | heal 11 / 3.0s | — |
| `hygieia_field_surgery` | Field Surgery | fire-only | heal 16 / 4.5s | — |
| `hygieia_restorative_hymn` | Restorative Hymn | fire-only | heal 22 / 6.0s | — |
| `hygieia_vital_bloom` | Vital Bloom | hybrid | heal 8 / 2.5s | own · heal · **+3** flat potency |
| `hygieia_caduceus_whisper` | Caduceus Whisper | Passive-only | — | own · God Hygieia · **−25% Cooldown** |
| `hygieia_overflow` | Overflow | Passive-only | — | own · heal · **Wand** · **+5** flat potency |

## Athena — aegis

| Key | Name | Shape | Fire | Passive |
|-----|------|-------|------|---------|
| `athena_aegis_chip` | Aegis Chip | fire-only | shield 8 / 2.5s | — |
| `athena_bronze_guard` | Bronze Guard | fire-only | shield 14 / 3.5s | — |
| `athena_tower_ward` | Tower Ward | fire-only | shield 19 / 5.0s | — |
| `athena_parthenon` | Parthenon | fire-only | shield 27 / 7.0s | — |
| `athena_reflective_plate` | Reflective Plate | hybrid | shield 11 / 3.5s | own · God Athena · shield · **+3** flat potency |
| `athena_phalanx` | Phalanx | Passive-only | — | own · God Athena · **−25% Cooldown** |
| `athena_bastion_doctrine` | Bastion Doctrine | Passive-only | — | own · shield · **+5** flat potency |

## Zeus — lightning

| Key | Name | Shape | Fire | Passive |
|-----|------|-------|------|---------|
| `zeus_spark_arc` | Spark Arc | fire-only | damage 10 / 2.5s | — |
| `zeus_chain_bolt` | Chain Bolt | fire-only | damage 12 / 3.0s | — |
| `zeus_thunderclap` | Thunderclap | fire-only | damage 14 / 3.5s | — |
| `zeus_skyfall` | Skyfall | fire-only | damage 18 / 4.5s | — |
| `zeus_storm_crown` | Storm Crown | hybrid | damage 11 / 3.0s | own · God Zeus · damage · **+10%** potency |
| `zeus_olympian_tempo` | Olympian Tempo | Passive-only | — | own · God Zeus · **−20% Cooldown** |
| `zeus_thunder_tyrant` | Thunder Tyrant | Passive-only | — | enemy · damage · **+15% Cooldown** (slows their damage) |
