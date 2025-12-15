import { GoogleGenAI, Type } from "@google/genai";
import { GameState, BatchTurnResult, LogEntry } from '../types';
import { WORLD_SETTING_PROMPT } from '../constants';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for a single event
const TURN_RESULT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    log: { type: Type.STRING, description: "A narrative description of what happened." },
    ageIncrement: { type: Type.INTEGER, description: "Years passed. MUST BE 0 for choice resolutions. MUST BE >1 for cultivation periods." },
    attributeChanges: {
      type: Type.OBJECT,
      properties: {
        essence: { type: Type.INTEGER },
        qi: { type: Type.INTEGER },
        spirit: { type: Type.INTEGER },
        rootBone: { type: Type.INTEGER },
        merit: { type: Type.INTEGER },
      },
      nullable: true,
    },
    newTechniques: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
    newArtifacts: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
    realmUpdate: { type: Type.STRING, description: "New realm name if changed, otherwise null/empty string.", nullable: true },
    isDead: { type: Type.BOOLEAN },
    deathReason: { type: Type.STRING, description: "If dead, strictly choose one suitable ending from the list in rules.", nullable: true },
    corruptionChange: { type: Type.INTEGER, description: "Change in hidden corruption stat.", nullable: true },
    awakeningChange: { type: Type.INTEGER, description: "Change in hidden awakening stat.", nullable: true },
    choiceEvent: {
      type: Type.OBJECT,
      description: "Only populate if a major decision is needed.",
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ["id", "text"],
          },
        },
      },
      required: ["id", "title", "description", "options"],
      nullable: true,
    },
  },
  required: ["log", "ageIncrement", "isDead"],
};

// Schema for the batch response
const BATCH_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      items: TURN_RESULT_SCHEMA,
      description: "A chronological list of events. The sequence MUST stop if a Choice is required or Death occurs."
    }
  },
  required: ["events"]
};

export const generateBatchTurns = async (
  gameState: GameState,
  choiceId: string | null = null,
  inheritedKnowledge: string = ""
): Promise<BatchTurnResult> => {
  const model = "gemini-2.5-flash";

  const actionDescription = choiceId 
    ? `PLAYER ACTION: RESOLVING CHOICE ID "${choiceId}".`
    : "PLAYER ACTION: AUTO-CULTIVATING / CONTINUING JOURNEY.";

  const knowledgeContext = inheritedKnowledge 
    ? `\n**INHERITED KNOWLEDGE:** The player currently possesses ancient scriptures or fragments of memory from previous incarnations:\n${inheritedKnowledge}\nThese texts may vaguely influence events or provide cryptic hints, but their contents are obscure.`
    : "";

  const context = `
    Current State:
    - Age: ${gameState.age}
    - Realm: ${gameState.realm}
    - Attributes: Essence=${gameState.attributes.essence}, Qi=${gameState.attributes.qi}, Spirit=${gameState.attributes.spirit}, RootBone=${gameState.attributes.rootBone}, Merit=${gameState.attributes.merit}
    - Corruption: ${gameState.corruption}
    - Awakening Level: ${gameState.awakeningLevel}
    - Techniques: ${gameState.techniques.join(', ')}
    - Artifacts: ${gameState.artifacts.join(', ')}
    - Previous Event: ${gameState.history.length > 0 ? gameState.history[gameState.history.length - 1].text : "Born"}
    
    ${knowledgeContext}

    *** ${actionDescription} ***
  `;

  const systemInstruction = `
    You are the game engine for 'Otherworldly Cultivation Simulator'.
    ${WORLD_SETTING_PROMPT}
    
    **TASK: GENERATE A BATCH OF EVENTS (1 to 5 events)**
    
    **STORYTELLING RULES (CRITICAL):**
    1. **Mo (Demons):** Trigger occasional events where ugly, distorted entities attack the player/sect. **TARGET: CULTIVATORS only.**
    2. **Tian Mo (Sky Demons):** Trigger rare events where organized Star-powered entities massacre cities or mortals. **TARGET: EVERYONE/ALL LIFE.**
    3. **The Truth:** Hint at the grotesque nature of the world (e.g., Qi feeling sticky like mucus, Elixirs smelling strange).
    4. **Inheritance:** If "Inherited Knowledge" is provided, allow it to occasionally cause Déjà vu or influence the discovery of techniques.
    5. **Language:** Simplified Chinese (zh-CN).
    
    **SEQUENCE RULES:**
    1. **If responding to a Choice (${choiceId ? "YES" : "NO"}):**
       - The FIRST event MUST be the immediate resolution of that choice.
       - **ageIncrement** for this resolution event MUST be **0**.
    
    2. **If Auto-Cultivating:**
       - Generate 3 to 5 routine events describing the cultivation progress, encounters, or insights.
       - **ageIncrement** for these events MUST be > 0.
    
    3. **STOPPING CONDITIONS:**
       - If **PLAYER CHOICE** needed -> Last event.
       - If **DEATH** (isDead=true) -> Last event.
    
    **Death Logic:**
    - >150y Mortal/Qi Refining -> Dead (Old Age).
    - >350y Foundation -> Dead (Old Age).
    - 500y/650y/800y -> Trigger Tribulations (High chance of death).
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { role: 'user', parts: [{ text: context }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: BATCH_RESPONSE_SCHEMA,
        temperature: 1.0, 
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const result = JSON.parse(jsonText) as BatchTurnResult;
    return result;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      events: [{
        log: "天道紊乱，无法推演未来... (API Error)",
        ageIncrement: 0,
        attributeChanges: {},
        isDead: false,
      }]
    };
  }
};

export const generateWorldAnalysis = async (history: LogEntry[], existingScripture: string): Promise<string> => {
    const model = "gemini-2.5-flash";
    const historyText = history.map(h => `[${h.age}岁] ${h.text}`).join("\n");
    
    const context = `
      **Player's Life Log:**
      ${historyText}

      **Existing Content of '宇外荒经' (Scripture of the Outer Wilds):**
      ${existingScripture || "(Empty)"}
    `;

    const systemInstruction = `
      You are the author of the mysterious 'Scripture of the Outer Wilds' (宇外荒经).
      The player character has just died without fully Awakening (seeing the True Dark Truth).
      
      **Task:**
      Analyze the player's life log to deduce the "laws of the world" from a LIMITED, MORTAL perspective. 
      Merge these deductions into the Existing Content.
      
      **Rules:**
      1. **Tone:** Archaic, mysterious, slightly confused but convinced. Like an ancient scholar trying to explain cosmic horror using cultivation terms.
      2. **Content:** 
         - Interpret "Mo" attacks as trials or corrupt spirits.
         - Interpret "Qi" anomalies as "impure energy" or "heavenly punishment", not knowing it's monster mucus.
         - Try to find patterns in why they died.
      3. **Integration:** DO NOT just append. Rewrite/Merge the text so it flows as a single coherent scripture. Keep it under 300 words.
      4. **Language:** Classical/Literary Chinese style (文言文风格 or 半白话).
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [{ role: 'user', parts: [{ text: context }] }],
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.8,
            },
        });
        return response.text || existingScripture;
    } catch (e) {
        console.error("Analysis failed", e);
        return existingScripture + "\n(天书残缺，无法辨认...)";
    }
}