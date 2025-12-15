import { Attributes } from './types';

export const INITIAL_POINTS = 20;
export const MAX_ATTRIBUTE = 10;

// Persistence Keys
export const STORAGE_KEY_POINTS = 'ocs_bonus_points';
export const STORAGE_KEY_SCRIPTURE = 'ocs_yuwai_huangjing'; // 宇外荒经 (Unawakened)
export const STORAGE_KEY_RECORD = 'ocs_tianwai_yiwenlu';   // 天外异闻箓 (Awakened)

export const INITIAL_ATTRIBUTES: Attributes = {
  essence: 1,
  qi: 0,
  spirit: 1,
  rootBone: 1,
  merit: 1,
};

// Simplified mapping for the AI to understand the progression logic quickly
export const REALMS = [
  '凡人 (Mortal)',
  '炼气期 (Qi Refining)',
  '筑基期 (Foundation Establishment)',
  '金丹期 (Golden Core)',
  '元婴期 (Nascent Soul)',
  '化神期 (Divinity Transformation)',
  '人仙 (Human Immortal)',
  '地仙 (Earth Immortal)',
  '神仙 (Spirit Immortal)',
  '天仙 (Heavenly Immortal)',
  '太乙金仙 (Taiyi Golden Immortal)',
  '大罗金仙 (Daluo Golden Immortal)',
  '混元金仙 (Hunyuan Golden Immortal)',
];

// Points awarded for reaching a realm (Max value is taken)
export const REALM_POINTS_MAP: Record<string, number> = {
  '凡人 (Mortal)': 0,
  '炼气期 (Qi Refining)': 1,
  '筑基期 (Foundation Establishment)': 2,
  '金丹期 (Golden Core)': 3,
  '元婴期 (Nascent Soul)': 5,
  '化神期 (Divinity Transformation)': 8,
  '人仙 (Human Immortal)': 12,
  '地仙 (Earth Immortal)': 15,
  '神仙 (Spirit Immortal)': 18,
  '天仙 (Heavenly Immortal)': 22,
  '太乙金仙 (Taiyi Golden Immortal)': 26,
  '大罗金仙 (Daluo Golden Immortal)': 30,
  '混元金仙 (Hunyuan Golden Immortal)': 40,
};

export const WORLD_SETTING_PROMPT = `
**World Setting (Dark Cosmic Horror Cultivation):**

1.  **Structure:** Universe = Time-Space Membranes (Planes).
2.  **Three Treasures (Vital for Survival):**
    *   **Essence (Jing):** Body/Health. The foundation.
    *   **Qi (Energy):** Flowing energy (Actually Monster Mucus).
    *   **Spirit (Shen):** Mind/Soul (Food for Monsters).
    *   *Rule:* No Body = Essence dissipates -> Qi dissipates -> Spirit dissipates (Death).
3.  **Limits (The "Fanti" Barriers):**
    *   **150y:** Mortal Limit (Toxin accumulation).
    *   **350y:** Golden Core Limit (Perfect Body needed).
    *   **500y:** **Thunder Tribulation** (Metaphysical lightning).
    *   **650y:** **Fire Tribulation** (Spontaneous combustion of Qi/Spirit).
    *   **800y:** **Wind Tribulation** (Disintegration by Void Wind).
4.  **Cultivation Paths:**
    *   **Human Immortal (Hardest):** Refine Body+Qi+Spirit. Triggers Tribulations.
    *   **Ghost Immortal:** Spirit attached to object/artifact. No further growth, just survival.
    *   **Earth Immortal:** Resonate with Nature. Stuck in location.
    *   **Spirit Immortal:** Resonate with Humans (Faith/Fear). Stuck in influence.
    *   **Heavenly Immortal:** Resonate with Planet. Risk of being swallowed by Planet Will.
5.  **THE DARK TRUTH (Awakening):**
    *   **The "Spirit World":** A dimension of grotesque monsters born from desires/emotions.
    *   **"Qi":** Mucus secreted by these monsters.
    *   **"Elixirs/Fruits":** Monster excrement/corpses. They contain "Toxins" that grant power but block true ascension.
    *   **"Ascension":** Crossing to the Spirit World to be eaten by monsters.
    *   **"Upper Realm Gifts":** Traps to farm high-quality "Spirit" (Shen) for monsters to eat.
6.  **ENEMIES (Specific Targeting):**
    *   **Mo (Demons):** Travelers from other planes, distorted and ugly. **TARGET: CULTIVATORS.** They want to steal cultivation/Qi.
    *   **Tian Mo (Sky Demons):** Organized, powered by Stars (Solar). **TARGET: ALL LIFE (Mortals & Cultivators).** Their goal is to kill all life to starve the Spirit World monsters. They appear as "Gods" or "Sky Demons".
    *   **Projectors/Alien Devils:** Cultivators taken over by signals from other planes.

**Simulation Rules:**
*   **Corruption:** Using Elixirs/Shortcuts increases "Toxins" (Corruption). High corruption prevents reaching Heavenly Immortal.
*   **Awakening:** Seeing the Truth leads to madness (Death) or despair.
*   **Death:** Describe the cause vividly (Old age, Tribulation, Mo Attack, Tian Mo Massacre).
`;