/**
 * Chess Master Pro - Alpha-Beta Search with Iterative Deepening
 * 
 * This is the heart of the chess engine. It uses:
 * - Minimax algorithm with alpha-beta pruning
 * - Iterative deepening for time management
 * - Quiescence search to avoid horizon effect
 * - Transposition table for memoization
 * - Move ordering for better pruning
 */

import type { Position, Move, SearchResult, SearchOptions, EvaluationBreakdown } from '../../types';
import { Color as ColorEnum } from '../../types';
import { generateLegalMoves, makeMove, isInCheck } from '../moves/generator';
import { evaluate, getEvaluationBreakdown, MATE_SCORE, DRAW_SCORE } from '../evaluation/evaluate';
import { computeHash } from './zobrist';
import { transpositionTable, TranspositionTable } from './transposition';
import { orderMoves, orderCaptures, killerMoves, historyTable, KillerMoves, HistoryTable } from './ordering';

// ============================================================================
// SEARCH STATE
// ============================================================================

interface SearchState {
  nodesSearched: number;
  startTime: number;
  maxTimeMs: number;
  shouldStop: boolean;
  principalVariation: Move[];
  currentDepth: number;
  killerMoves: KillerMoves;
  historyTable: HistoryTable;
  transpositionTable: TranspositionTable;
}

/**
 * Create initial search state
 */
function createSearchState(maxTimeMs: number): SearchState {
  return {
    nodesSearched: 0,
    startTime: Date.now(),
    maxTimeMs,
    shouldStop: false,
    principalVariation: [],
    currentDepth: 0,
    killerMoves,
    historyTable,
    transpositionTable,
  };
}

/**
 * Check if search should be stopped (time limit reached)
 */
function shouldStopSearch(state: SearchState): boolean {
  if (state.shouldStop) return true;
  
  // Check time every 1000 nodes
  if (state.nodesSearched % 1000 === 0) {
    const elapsed = Date.now() - state.startTime;
    if (elapsed >= state.maxTimeMs) {
      state.shouldStop = true;
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// QUIESCENCE SEARCH
// ============================================================================

/**
 * Quiescence search - extends search on tactical positions
 * Only considers captures to reach a "quiet" position
 */
function quiescence(
  position: Position,
  alpha: number,
  beta: number,
  state: SearchState
): number {
  if (shouldStopSearch(state)) {
    return 0;
  }
  
  state.nodesSearched++;
  
  // Stand pat: evaluate current position
  const standPat = evaluate(position);
  
  // Return relative to side to move
  const score = position.sideToMove === ColorEnum.WHITE ? standPat : -standPat;
  
  // Beta cutoff
  if (score >= beta) {
    return beta;
  }
  
  // Update alpha
  if (score > alpha) {
    alpha = score;
  }
  
  // Generate and order captures only
  const legalMoves = generateLegalMoves(position);
  const captures = legalMoves.filter(move => move.captured !== undefined);
  
  if (captures.length === 0) {
    return alpha;
  }
  
  orderCaptures(captures);
  
  // Search captures
  for (const move of captures) {
    const newPosition = makeMove(position, move);
    const moveScore = -quiescence(newPosition, -beta, -alpha, state);
    
    if (moveScore >= beta) {
      return beta;
    }
    
    if (moveScore > alpha) {
      alpha = moveScore;
    }
  }
  
  return alpha;
}

// ============================================================================
// ALPHA-BETA SEARCH
// ============================================================================

/**
 * Alpha-beta search with negamax framework
 */
function alphaBeta(
  position: Position,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  state: SearchState,
  pv: Move[]
): number {
  if (shouldStopSearch(state)) {
    return 0;
  }
  
  // Check transposition table
  const hash = computeHash(position);
  const ttEntry = state.transpositionTable.probe(hash);
  
  if (ttEntry !== null && ttEntry.depth >= depth) {
    if (ttEntry.nodeType === 'exact') {
      return ttEntry.evaluation;
    }
    if (ttEntry.nodeType === 'lowerBound' && ttEntry.evaluation >= beta) {
      return beta;
    }
    if (ttEntry.nodeType === 'upperBound' && ttEntry.evaluation <= alpha) {
      return alpha;
    }
  }
  
  // Leaf node - use quiescence search
  if (depth <= 0) {
    return quiescence(position, alpha, beta, state);
  }
  
  state.nodesSearched++;
  
  // Generate legal moves
  const legalMoves = generateLegalMoves(position);
  
  // Check for checkmate or stalemate
  if (legalMoves.length === 0) {
    if (isInCheck(position.board, position.sideToMove)) {
      // Checkmate - return negative mate score (bad for current player)
      return -MATE_SCORE + ply; // Prefer faster mates
    }
    // Stalemate
    return DRAW_SCORE;
  }
  
  // Draw by 50-move rule
  if (position.halfmoveClock >= 100) {
    return DRAW_SCORE;
  }
  
  // Get hash move for ordering
  const hashMove = ttEntry?.bestMove ?? null;
  
  // Order moves
  orderMoves(legalMoves, hashMove, state.killerMoves, state.historyTable, ply);
  
  // Search moves
  let bestMove: Move | null = null;
  let bestScore = -Infinity;
  let nodeType: 'exact' | 'lowerBound' | 'upperBound' = 'upperBound';
  const localPv: Move[] = [];
  
  for (const move of legalMoves) {
    const newPosition = makeMove(position, move);
    const childPv: Move[] = [];
    
    const score = -alphaBeta(newPosition, depth - 1, -beta, -alpha, ply + 1, state, childPv);
    
    if (state.shouldStop) {
      return 0;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
      
      // Update local PV
      localPv.length = 0;
      localPv.push(move, ...childPv);
    }
    
    if (score > alpha) {
      alpha = score;
      nodeType = 'exact';
      
      // Copy PV to parent
      pv.length = 0;
      pv.push(...localPv);
    }
    
    if (alpha >= beta) {
      // Beta cutoff
      nodeType = 'lowerBound';
      
      // Update killer moves and history
      if (!move.captured) {
        state.killerMoves.add(ply, move);
        state.historyTable.addCutoff(move, depth);
      }
      
      break;
    }
  }
  
  // Store in transposition table
  if (bestMove !== null) {
    state.transpositionTable.store(hash, depth, bestScore, nodeType, bestMove);
  }
  
  return bestScore;
}

// ============================================================================
// ITERATIVE DEEPENING
// ============================================================================

/**
 * Main search function using iterative deepening
 */
export function search(position: Position, options: SearchOptions): SearchResult {
  const state = createSearchState(options.maxTimeMs);
  
  let bestMove: Move | null = null;
  let bestEvaluation = 0;
  let bestPv: Move[] = [];
  let completedDepth = 0;
  
  // Clear killer moves for new search
  state.killerMoves.clear();
  
  // Iterative deepening
  for (let depth = 1; depth <= options.maxDepth; depth++) {
    state.currentDepth = depth;
    const pv: Move[] = [];
    
    const score = alphaBeta(
      position,
      depth,
      -Infinity,
      Infinity,
      0,
      state,
      pv
    );
    
    // Check if search was aborted
    if (state.shouldStop && depth > 1) {
      break;
    }
    
    // Update best results
    if (pv.length > 0) {
      const firstMove = pv[0];
      if (firstMove) {
        bestMove = firstMove;
        bestEvaluation = position.sideToMove === ColorEnum.WHITE ? score : -score;
        bestPv = [...pv];
        completedDepth = depth;
      }
    }
    
    // Early exit if mate found
    if (Math.abs(score) >= MATE_SCORE - 100) {
      break;
    }
  }
  
  // Fallback: get any legal move if search failed
  if (bestMove === null) {
    const legalMoves = generateLegalMoves(position);
    if (legalMoves.length > 0 && legalMoves[0]) {
      bestMove = legalMoves[0];
      bestEvaluation = evaluate(position);
    }
  }
  
  // Get evaluation breakdown
  const breakdown = getEvaluationBreakdown(position);
  
  // Generate explanation
  const explanation = generateExplanation(bestMove, breakdown, bestEvaluation);
  
  const timeMs = Date.now() - state.startTime;
  
  return {
    bestMove: bestMove!,
    evaluation: bestEvaluation,
    evaluationBreakdown: breakdown,
    principalVariation: bestPv,
    depth: completedDepth,
    nodesSearched: state.nodesSearched,
    timeMs,
    explanation,
  };
}

// ============================================================================
// EXPLAINABLE AI
// ============================================================================

/**
 * Generate human-readable explanation for a move
 */
function generateExplanation(
  move: Move | null,
  breakdown: EvaluationBreakdown,
  evaluation: number
): string[] {
  const reasons: string[] = [];
  
  if (move === null) {
    reasons.push('No legal moves available');
    return reasons;
  }
  
  // Overall assessment
  if (Math.abs(evaluation) >= MATE_SCORE - 100) {
    const mateIn = Math.ceil((MATE_SCORE - Math.abs(evaluation)) / 2);
    if (evaluation > 0) {
      reasons.push(`Checkmate for White in ${mateIn} moves`);
    } else {
      reasons.push(`Checkmate for Black in ${mateIn} moves`);
    }
  } else if (evaluation > 200) {
    reasons.push('White has a winning advantage');
  } else if (evaluation > 50) {
    reasons.push('White has a slight advantage');
  } else if (evaluation < -200) {
    reasons.push('Black has a winning advantage');
  } else if (evaluation < -50) {
    reasons.push('Black has a slight advantage');
  } else {
    reasons.push('Position is roughly equal');
  }
  
  // Material assessment
  if (Math.abs(breakdown.material) > 100) {
    const side = breakdown.material > 0 ? 'White' : 'Black';
    const pawns = Math.abs(breakdown.material / 100).toFixed(1);
    reasons.push(`${side} is up ${pawns} pawns worth of material`);
  }
  
  // King safety
  if (Math.abs(breakdown.kingSafety) > 30) {
    const side = breakdown.kingSafety > 0 ? 'White' : 'Black';
    reasons.push(`${side} has better king safety`);
  }
  
  // Center control
  if (Math.abs(breakdown.centerControl) > 20) {
    const side = breakdown.centerControl > 0 ? 'White' : 'Black';
    reasons.push(`${side} controls the center`);
  }
  
  // Mobility
  if (Math.abs(breakdown.mobility) > 30) {
    const side = breakdown.mobility > 0 ? 'White' : 'Black';
    reasons.push(`${side} has better piece mobility`);
  }
  
  // Move-specific reasons
  if (move.captured) {
    reasons.push(`Captures ${move.captured.type}`);
  }
  
  if (move.promotion) {
    reasons.push(`Promotes pawn to ${move.promotion}`);
  }
  
  if (move.moveType === 'castlingKingside' || move.moveType === 'castlingQueenside') {
    reasons.push('Castles for king safety');
  }
  
  return reasons;
}

/**
 * Simple search for move validation (used by game controller)
 */
export function findBestMove(position: Position, maxDepth: number, maxTimeMs: number): Move | null {
  const result = search(position, {
    maxDepth,
    maxTimeMs,
    difficulty: 'medium',
    playStyle: 'balanced',
    mistakeProbability: 0,
  });
  
  return result.bestMove;
}
