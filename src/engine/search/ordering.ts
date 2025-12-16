/**
 * Chess Master Pro - Move Ordering
 * 
 * Move ordering is crucial for alpha-beta pruning efficiency.
 * Better move ordering leads to more cutoffs and faster search.
 * 
 * Ordering priorities:
 * 1. Hash move (best move from transposition table)
 * 2. Captures (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
 * 3. Killer moves (quiet moves that caused beta cutoffs)
 * 4. History heuristic (moves that frequently cause cutoffs)
 * 5. Other moves
 */

import type { Move, PieceType as PieceTypeT } from '../../types';
import { PieceType, MoveType } from '../../types';
import { PIECE_VALUES } from '../evaluation/evaluate';

// ============================================================================
// MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
// ============================================================================

/** Piece value order for MVV-LVA (higher = more valuable) */
const MVV_LVA_VICTIM: Record<PieceTypeT, number> = {
  [PieceType.PAWN]: 1,
  [PieceType.KNIGHT]: 2,
  [PieceType.BISHOP]: 3,
  [PieceType.ROOK]: 4,
  [PieceType.QUEEN]: 5,
  [PieceType.KING]: 6,
};

const MVV_LVA_ATTACKER: Record<PieceTypeT, number> = {
  [PieceType.KING]: 1,
  [PieceType.QUEEN]: 2,
  [PieceType.ROOK]: 3,
  [PieceType.BISHOP]: 4,
  [PieceType.KNIGHT]: 5,
  [PieceType.PAWN]: 6,
};

/**
 * Calculate MVV-LVA score for a capture
 */
function getMvvLvaScore(move: Move): number {
  if (!move.captured) return 0;
  
  const victim = MVV_LVA_VICTIM[move.captured.type];
  const attacker = MVV_LVA_ATTACKER[move.piece.type];
  
  return victim * 10 + attacker;
}

// ============================================================================
// KILLER MOVES
// ============================================================================

const MAX_KILLER_MOVES = 2;

/**
 * Killer moves table: stores quiet moves that caused beta cutoffs
 * Indexed by ply (depth from root)
 */
export class KillerMoves {
  private killers: Array<Move[]>;
  private maxPly: number;
  
  constructor(maxPly: number = 64) {
    this.maxPly = maxPly;
    this.killers = [];
    for (let i = 0; i < maxPly; i++) {
      this.killers[i] = [];
    }
  }
  
  /**
   * Add a killer move at the given ply
   */
  add(ply: number, move: Move): void {
    if (ply >= this.maxPly) return;
    
    // Don't add captures as killers
    if (move.captured) return;
    
    const plyKillers = this.killers[ply];
    if (!plyKillers) return;
    
    // Check if already a killer
    for (const killer of plyKillers) {
      if (this.movesEqual(killer, move)) return;
    }
    
    // Add new killer, removing oldest if full
    plyKillers.unshift(move);
    if (plyKillers.length > MAX_KILLER_MOVES) {
      plyKillers.pop();
    }
  }
  
  /**
   * Check if a move is a killer at the given ply
   */
  isKiller(ply: number, move: Move): boolean {
    if (ply >= this.maxPly) return false;
    
    const plyKillers = this.killers[ply];
    if (!plyKillers) return false;
    
    return plyKillers.some(killer => this.movesEqual(killer, move));
  }
  
  /**
   * Get killer moves at the given ply
   */
  get(ply: number): Move[] {
    if (ply >= this.maxPly) return [];
    return this.killers[ply] ?? [];
  }
  
  /**
   * Clear all killer moves
   */
  clear(): void {
    for (const plyKillers of this.killers) {
      plyKillers.length = 0;
    }
  }
  
  private movesEqual(a: Move, b: Move): boolean {
    return a.from === b.from && a.to === b.to && a.promotion === b.promotion;
  }
}

// ============================================================================
// HISTORY HEURISTIC
// ============================================================================

/**
 * History heuristic: tracks how often moves cause cutoffs
 * Indexed by [piece][toSquare]
 */
export class HistoryTable {
  private table: Map<string, number>;
  private maxValue: number;
  
  constructor() {
    this.table = new Map();
    this.maxValue = 0;
  }
  
  /**
   * Generate key for a move
   */
  private getKey(move: Move): string {
    return `${move.piece.color}${move.piece.type}${move.to}`;
  }
  
  /**
   * Update history for a move that caused a cutoff
   */
  addCutoff(move: Move, depth: number): void {
    const key = this.getKey(move);
    const current = this.table.get(key) ?? 0;
    const bonus = depth * depth; // Deeper moves get higher bonus
    const newValue = current + bonus;
    
    this.table.set(key, newValue);
    this.maxValue = Math.max(this.maxValue, newValue);
    
    // Age history periodically to prevent overflow
    if (this.maxValue > 10000) {
      this.age();
    }
  }
  
  /**
   * Get history score for a move
   */
  getScore(move: Move): number {
    const key = this.getKey(move);
    return this.table.get(key) ?? 0;
  }
  
  /**
   * Age all history values (divide by 2)
   */
  private age(): void {
    for (const [key, value] of this.table) {
      this.table.set(key, Math.floor(value / 2));
    }
    this.maxValue = Math.floor(this.maxValue / 2);
  }
  
  /**
   * Clear history table
   */
  clear(): void {
    this.table.clear();
    this.maxValue = 0;
  }
}

// ============================================================================
// MOVE SCORING AND ORDERING
// ============================================================================

/** Move score components */
const SCORE = {
  HASH_MOVE: 1000000,
  WINNING_CAPTURE: 100000,
  EQUAL_CAPTURE: 50000,
  KILLER_1: 40000,
  KILLER_2: 39000,
  LOSING_CAPTURE: 30000,
  HISTORY_BASE: 0,
  PROMOTION: 80000,
};

/**
 * Score a single move for ordering
 */
export function scoreMove(
  move: Move,
  hashMove: Move | null,
  killerMoves: KillerMoves,
  historyTable: HistoryTable,
  ply: number
): number {
  // Hash move (PV move) - highest priority
  if (hashMove && move.from === hashMove.from && move.to === hashMove.to) {
    return SCORE.HASH_MOVE;
  }
  
  // Promotions
  if (move.promotion) {
    const promotionValue = PIECE_VALUES[move.promotion];
    return SCORE.PROMOTION + promotionValue;
  }
  
  // Captures (MVV-LVA)
  if (move.captured) {
    const mvvLva = getMvvLvaScore(move);
    
    // Classify captures
    const victimValue = PIECE_VALUES[move.captured.type];
    const attackerValue = PIECE_VALUES[move.piece.type];
    
    if (victimValue > attackerValue) {
      return SCORE.WINNING_CAPTURE + mvvLva;
    } else if (victimValue === attackerValue) {
      return SCORE.EQUAL_CAPTURE + mvvLva;
    } else {
      return SCORE.LOSING_CAPTURE + mvvLva;
    }
  }
  
  // Killer moves
  const killers = killerMoves.get(ply);
  for (let i = 0; i < killers.length; i++) {
    const killer = killers[i];
    if (killer && move.from === killer.from && move.to === killer.to) {
      return i === 0 ? SCORE.KILLER_1 : SCORE.KILLER_2;
    }
  }
  
  // History heuristic
  return SCORE.HISTORY_BASE + historyTable.getScore(move);
}

/**
 * Order moves by their scores (in place)
 */
export function orderMoves(
  moves: Move[],
  hashMove: Move | null,
  killerMoves: KillerMoves,
  historyTable: HistoryTable,
  ply: number
): void {
  // Score all moves
  const scored = moves.map(move => ({
    move,
    score: scoreMove(move, hashMove, killerMoves, historyTable, ply),
  }));
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Update original array
  for (let i = 0; i < moves.length; i++) {
    const scoredMove = scored[i];
    if (scoredMove) {
      moves[i] = scoredMove.move;
    }
  }
}

/**
 * Simple capture-first ordering for quiescence search
 */
export function orderCaptures(moves: Move[]): void {
  moves.sort((a, b) => {
    const scoreA = a.captured ? getMvvLvaScore(a) : 0;
    const scoreB = b.captured ? getMvvLvaScore(b) : 0;
    return scoreB - scoreA;
  });
}

// Global instances
export const killerMoves = new KillerMoves();
export const historyTable = new HistoryTable();
