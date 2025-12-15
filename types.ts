
export enum GamePhase {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED',
}

export interface Attributes {
  essence: number; // 精 (Body/Health)
  qi: number;      // 气 (Energy/Mana)
  spirit: number;  // 神 (Mind/Soul)
  rootBone: number; // 根骨 (Potential)
  merit: number;   // 功德/气运 (Luck/Karma)
}

export interface GameState {
  phase: GamePhase;
  age: number;
  realm: string; // Current Cultivation Level (e.g., Mortal, Qi Refining, Foundation, Golden Core)
  attributes: Attributes;
  techniques: string[];
  artifacts: string[];
  history: LogEntry[];
  isDead: boolean;
  deathReason?: string;
  pendingChoice?: ChoiceEvent | null;
  awakeningLevel: number; // Hidden stat: 0-100. Higher means closer to seeing the Truth.
  corruption: number; // Hidden stat: Accumulation of "toxins" or alien influence.
}

export interface LogEntry {
  age: number;
  text: string;
  type: 'normal' | 'important' | 'danger' | 'success' | 'choice';
}

export interface ChoiceOption {
  id: string;
  text: string;
}

export interface ChoiceEvent {
  id: string;
  title: string;
  description: string;
  options: ChoiceOption[];
}

export interface TurnResult {
  log: string;
  ageIncrement: number;
  attributeChanges: Partial<Attributes>;
  newTechniques?: string[];
  newArtifacts?: string[];
  realmUpdate?: string;
  isDead: boolean;
  deathReason?: string;
  choiceEvent?: ChoiceEvent;
  corruptionChange?: number;
  awakeningChange?: number;
}

export interface BatchTurnResult {
  events: TurnResult[];
}
