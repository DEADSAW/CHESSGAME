/**
 * Chess Master Pro - AI Difficulty System
 * 
 * This module implements different difficulty levels with human-like behavior.
 * Each level adjusts search depth, time, and introduces controlled mistakes.
 */

import type { 
  Position, 
  Move, 
  SearchResult, 
  SearchOptions, 
  Difficulty, 
  PlayStyle 
} from '../../types';
import { Difficulty as DifficultyEnum, PlayStyle as PlayStyleEnum } from '../../types';
import { search } from '../search/search';
import { generateLegalMoves, makeMove } from '../moves/generator';
import { evaluate } from '../evaluation/evaluate';

// ============================================================================
// DIFFICULTY CONFIGURATIONS
// ============================================================================

interface DifficultyConfig {
  /** Maximum search depth */
  maxDepth: number;
  /** Maximum search time in ms */
  maxTimeMs: number;
  /** Probability of making a suboptimal move (0-1) */
  mistakeProbability: number;
  /** Probability of making a blunder (0-1) */
  blunderProbability: number;
  /** How many moves to consider for random selection */
  randomPoolSize: number;
  /** Evaluation variance for human-like play */
  evaluationNoise: number;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  [DifficultyEnum.BEGINNER]: {
    maxDepth: 2,
    maxTimeMs: 500,
    mistakeProbability: 0.4,
    blunderProbability: 0.15,
    randomPoolSize: 5,
    evaluationNoise: 150,
  },
  [DifficultyEnum.EASY]: {
    maxDepth: 3,
    maxTimeMs: 1000,
    mistakeProbability: 0.25,
    blunderProbability: 0.05,
    randomPoolSize: 4,
    evaluationNoise: 80,
  },
  [DifficultyEnum.MEDIUM]: {
    maxDepth: 4,
    maxTimeMs: 2000,
    mistakeProbability: 0.1,
    blunderProbability: 0.02,
    randomPoolSize: 3,
    evaluationNoise: 40,
  },
  [DifficultyEnum.HARD]: {
    maxDepth: 5,
    maxTimeMs: 3000,
    mistakeProbability: 0.03,
    blunderProbability: 0,
    randomPoolSize: 2,
    evaluationNoise: 15,
  },
  [DifficultyEnum.EXPERT]: {
    maxDepth: 6,
    maxTimeMs: 5000,
    mistakeProbability: 0,
    blunderProbability: 0,
    randomPoolSize: 1,
    evaluationNoise: 0,
  },
};

// ============================================================================
// PLAY STYLE BIASES
// ============================================================================

interface StyleBias {
  /** Bonus for aggressive moves (captures, attacks) */
  aggressiveBonus: number;
  /** Bonus for defensive moves (king safety, piece protection) */
  defensiveBonus: number;
  /** Bonus for central control */
  centerBonus: number;
  /** Bonus for piece activity */
  activityBonus: number;
}

const STYLE_BIASES: Record<PlayStyle, StyleBias> = {
  [PlayStyleEnum.AGGRESSIVE]: {
    aggressiveBonus: 30,
    defensiveBonus: -10,
    centerBonus: 15,
    activityBonus: 20,
  },
  [PlayStyleEnum.DEFENSIVE]: {
    aggressiveBonus: -10,
    defensiveBonus: 30,
    centerBonus: 10,
    activityBonus: 5,
  },
  [PlayStyleEnum.BALANCED]: {
    aggressiveBonus: 10,
    defensiveBonus: 10,
    centerBonus: 10,
    activityBonus: 10,
  },
};

// ============================================================================
// MOVE EVALUATION WITH STYLE
// ============================================================================

interface ScoredMove {
  move: Move;
  baseScore: number;
  adjustedScore: number;
}

/**
 * Apply style bias to a move's evaluation
 */
function applyStyleBias(move: Move, baseScore: number, style: PlayStyle): number {
  const bias = STYLE_BIASES[style];
  let adjustment = 0;
  
  // Aggressive bonus for captures
  if (move.captured) {
    adjustment += bias.aggressiveBonus;
  }
  
  // Center control bonus
  const toFile = move.to % 8;
  const toRank = Math.floor(move.to / 8);
  const isCenter = toFile >= 2 && toFile <= 5 && toRank >= 2 && toRank <= 5;
  if (isCenter) {
    adjustment += bias.centerBonus;
  }
  
  // Activity bonus for piece development
  const fromRank = Math.floor(move.from / 8);
  const isWhite = move.piece.color === 'w';
  const startRank = isWhite ? 0 : 7;
  if (fromRank === startRank && toRank !== startRank) {
    adjustment += bias.activityBonus;
  }
  
  return baseScore + adjustment;
}

/**
 * Add random noise to evaluation for human-like uncertainty
 */
function addEvaluationNoise(score: number, noise: number): number {
  if (noise === 0) return score;
  const randomNoise = (Math.random() - 0.5) * 2 * noise;
  return score + randomNoise;
}

// ============================================================================
// AI MOVE SELECTION
// ============================================================================

/**
 * Calculate search result for AI move
 */
export function calculateAiMove(
  position: Position,
  difficulty: Difficulty,
  playStyle: PlayStyle
): SearchResult {
  const config = DIFFICULTY_CONFIGS[difficulty];
  
  // Run the engine search
  const searchOptions: SearchOptions = {
    maxDepth: config.maxDepth,
    maxTimeMs: config.maxTimeMs,
    difficulty,
    playStyle,
    mistakeProbability: config.mistakeProbability,
  };
  
  const searchResult = search(position, searchOptions);
  
  // Apply human-like behavior
  const adjustedResult = applyHumanBehavior(
    position,
    searchResult,
    config,
    playStyle
  );
  
  return adjustedResult;
}

/**
 * Apply human-like behavior to move selection
 */
function applyHumanBehavior(
  position: Position,
  searchResult: SearchResult,
  config: DifficultyConfig,
  playStyle: PlayStyle
): SearchResult {
  // Get all legal moves
  const legalMoves = generateLegalMoves(position);
  
  if (legalMoves.length <= 1) {
    return searchResult; // Only one move, no choice
  }
  
  // Check for blunder
  if (Math.random() < config.blunderProbability) {
    const blunderMove = selectBlunderMove(position, legalMoves);
    if (blunderMove) {
      return createBlunderResult(blunderMove, searchResult);
    }
  }
  
  // Check for mistake (suboptimal but not terrible)
  if (Math.random() < config.mistakeProbability) {
    const mistakeMove = selectMistakeMove(
      position,
      legalMoves,
      searchResult.bestMove,
      config,
      playStyle
    );
    if (mistakeMove) {
      return createMistakeResult(mistakeMove, searchResult);
    }
  }
  
  // Return original result (possibly with style adjustment)
  return searchResult;
}

/**
 * Select a blunder move (clearly bad move for realistic beginner play)
 */
function selectBlunderMove(position: Position, moves: Move[]): Move | null {
  // Find moves that lose material
  const scoredMoves: ScoredMove[] = moves.map(move => {
    const newPosition = makeMove(position, move);
    const score = evaluate(newPosition);
    return {
      move,
      baseScore: position.sideToMove === 'w' ? score : -score,
      adjustedScore: score,
    };
  });
  
  // Sort by score (worst first for blunders)
  scoredMoves.sort((a, b) => a.baseScore - b.baseScore);
  
  // Pick from the worst moves
  const worstMoves = scoredMoves.slice(0, 3);
  const randomIndex = Math.floor(Math.random() * worstMoves.length);
  return worstMoves[randomIndex]?.move ?? null;
}

/**
 * Select a mistake move (suboptimal but reasonable)
 */
function selectMistakeMove(
  position: Position,
  moves: Move[],
  bestMove: Move,
  config: DifficultyConfig,
  playStyle: PlayStyle
): Move | null {
  // Score all moves
  const scoredMoves: ScoredMove[] = moves.map(move => {
    const newPosition = makeMove(position, move);
    const baseScore = position.sideToMove === 'w' ? evaluate(newPosition) : -evaluate(newPosition);
    const adjustedScore = addEvaluationNoise(
      applyStyleBias(move, baseScore, playStyle),
      config.evaluationNoise
    );
    return { move, baseScore, adjustedScore };
  });
  
  // Sort by adjusted score
  scoredMoves.sort((a, b) => b.adjustedScore - a.adjustedScore);
  
  // Pick from top N moves (not the best)
  const candidatePool = scoredMoves.slice(1, config.randomPoolSize + 1);
  
  if (candidatePool.length === 0) {
    return null;
  }
  
  // Weighted random selection favoring higher scores
  const totalWeight = candidatePool.reduce((sum, m, i) => sum + (candidatePool.length - i), 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < candidatePool.length; i++) {
    const weight = candidatePool.length - i;
    random -= weight;
    if (random <= 0) {
      return candidatePool[i]?.move ?? null;
    }
  }
  
  return candidatePool[0]?.move ?? null;
}

/**
 * Create search result for a blunder move
 */
function createBlunderResult(blunderMove: Move, original: SearchResult): SearchResult {
  return {
    ...original,
    bestMove: blunderMove,
    explanation: [
      ...original.explanation,
      'AI made an inaccurate move (human-like error)',
    ],
  };
}

/**
 * Create search result for a mistake move
 */
function createMistakeResult(mistakeMove: Move, original: SearchResult): SearchResult {
  return {
    ...original,
    bestMove: mistakeMove,
    explanation: [
      ...original.explanation,
      'AI played a slightly suboptimal move (human-like variation)',
    ],
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get configuration for a difficulty level
 */
export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}

/**
 * Get style bias configuration
 */
export function getStyleBias(style: PlayStyle): StyleBias {
  return STYLE_BIASES[style];
}

/**
 * Get human-readable difficulty description
 */
export function getDifficultyDescription(difficulty: Difficulty): string {
  switch (difficulty) {
    case DifficultyEnum.BEGINNER:
      return 'Beginner: Makes frequent mistakes, low search depth';
    case DifficultyEnum.EASY:
      return 'Easy: Occasionally misses tactics, moderate play';
    case DifficultyEnum.MEDIUM:
      return 'Medium: Solid play with occasional inaccuracies';
    case DifficultyEnum.HARD:
      return 'Hard: Strong tactical and positional play';
    case DifficultyEnum.EXPERT:
      return 'Expert: Maximum strength, no mistakes';
  }
}
