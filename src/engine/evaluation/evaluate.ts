/**
 * Chess Master Pro - Position Evaluation
 * 
 * This module evaluates chess positions from the perspective of the side to move.
 * A positive score means the position favors white, negative favors black.
 * 
 * Evaluation components:
 * - Material count
 * - Piece-square tables (positional bonuses)
 * - Mobility (number of legal moves)
 * - King safety
 * - Pawn structure
 * - Center control
 */

import type { Position, Board, Color, Piece, EvaluationBreakdown, SquareIndex } from '../../types';
import { PieceType, Color as ColorEnum } from '../../types';
import { getFile, getRank, toSquareIndex } from '../board/constants';
import { findKing, getPiecesForColor } from '../board/utils';
import { generateLegalMoves, isSquareAttacked } from '../moves/generator';

// ============================================================================
// PIECE VALUES (in centipawns)
// ============================================================================

export const PIECE_VALUES: Record<PieceType, number> = {
  [PieceType.PAWN]: 100,
  [PieceType.KNIGHT]: 320,
  [PieceType.BISHOP]: 330,
  [PieceType.ROOK]: 500,
  [PieceType.QUEEN]: 900,
  [PieceType.KING]: 20000, // Infinite for practical purposes
};

// ============================================================================
// PIECE-SQUARE TABLES
// Tables are from White's perspective, flip for Black
// Higher values = better squares for that piece
// ============================================================================

/** Pawn piece-square table */
const PAWN_PST: readonly number[] = [
   0,   0,   0,   0,   0,   0,   0,   0,
  50,  50,  50,  50,  50,  50,  50,  50,
  10,  10,  20,  30,  30,  20,  10,  10,
   5,   5,  10,  25,  25,  10,   5,   5,
   0,   0,   0,  20,  20,   0,   0,   0,
   5,  -5, -10,   0,   0, -10,  -5,   5,
   5,  10,  10, -20, -20,  10,  10,   5,
   0,   0,   0,   0,   0,   0,   0,   0,
];

/** Knight piece-square table */
const KNIGHT_PST: readonly number[] = [
 -50, -40, -30, -30, -30, -30, -40, -50,
 -40, -20,   0,   0,   0,   0, -20, -40,
 -30,   0,  10,  15,  15,  10,   0, -30,
 -30,   5,  15,  20,  20,  15,   5, -30,
 -30,   0,  15,  20,  20,  15,   0, -30,
 -30,   5,  10,  15,  15,  10,   5, -30,
 -40, -20,   0,   5,   5,   0, -20, -40,
 -50, -40, -30, -30, -30, -30, -40, -50,
];

/** Bishop piece-square table */
const BISHOP_PST: readonly number[] = [
 -20, -10, -10, -10, -10, -10, -10, -20,
 -10,   0,   0,   0,   0,   0,   0, -10,
 -10,   0,   5,  10,  10,   5,   0, -10,
 -10,   5,   5,  10,  10,   5,   5, -10,
 -10,   0,  10,  10,  10,  10,   0, -10,
 -10,  10,  10,  10,  10,  10,  10, -10,
 -10,   5,   0,   0,   0,   0,   5, -10,
 -20, -10, -10, -10, -10, -10, -10, -20,
];

/** Rook piece-square table */
const ROOK_PST: readonly number[] = [
   0,   0,   0,   0,   0,   0,   0,   0,
   5,  10,  10,  10,  10,  10,  10,   5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
   0,   0,   0,   5,   5,   0,   0,   0,
];

/** Queen piece-square table */
const QUEEN_PST: readonly number[] = [
 -20, -10, -10,  -5,  -5, -10, -10, -20,
 -10,   0,   0,   0,   0,   0,   0, -10,
 -10,   0,   5,   5,   5,   5,   0, -10,
  -5,   0,   5,   5,   5,   5,   0,  -5,
   0,   0,   5,   5,   5,   5,   0,  -5,
 -10,   5,   5,   5,   5,   5,   0, -10,
 -10,   0,   5,   0,   0,   0,   0, -10,
 -20, -10, -10,  -5,  -5, -10, -10, -20,
];

/** King piece-square table (middlegame) */
const KING_PST_MG: readonly number[] = [
 -30, -40, -40, -50, -50, -40, -40, -30,
 -30, -40, -40, -50, -50, -40, -40, -30,
 -30, -40, -40, -50, -50, -40, -40, -30,
 -30, -40, -40, -50, -50, -40, -40, -30,
 -20, -30, -30, -40, -40, -30, -30, -20,
 -10, -20, -20, -20, -20, -20, -20, -10,
  20,  20,   0,   0,   0,   0,  20,  20,
  20,  30,  10,   0,   0,  10,  30,  20,
];

/** King piece-square table (endgame) */
const KING_PST_EG: readonly number[] = [
 -50, -40, -30, -20, -20, -30, -40, -50,
 -30, -20, -10,   0,   0, -10, -20, -30,
 -30, -10,  20,  30,  30,  20, -10, -30,
 -30, -10,  30,  40,  40,  30, -10, -30,
 -30, -10,  30,  40,  40,  30, -10, -30,
 -30, -10,  20,  30,  30,  20, -10, -30,
 -30, -30,   0,   0,   0,   0, -30, -30,
 -50, -30, -30, -30, -30, -30, -30, -50,
];

const PST_TABLES: Record<PieceType, readonly number[]> = {
  [PieceType.PAWN]: PAWN_PST,
  [PieceType.KNIGHT]: KNIGHT_PST,
  [PieceType.BISHOP]: BISHOP_PST,
  [PieceType.ROOK]: ROOK_PST,
  [PieceType.QUEEN]: QUEEN_PST,
  [PieceType.KING]: KING_PST_MG,
};

// ============================================================================
// EVALUATION FUNCTIONS
// ============================================================================

/**
 * Get piece-square table value for a piece at a square
 */
function getPstValue(piece: Piece, square: SquareIndex, isEndgame: boolean): number {
  const table = piece.type === PieceType.KING && isEndgame 
    ? KING_PST_EG 
    : PST_TABLES[piece.type];
  
  // Flip square for black pieces (mirror vertically)
  const adjustedSquare = piece.color === ColorEnum.WHITE 
    ? square 
    : (7 - getRank(square)) * 8 + getFile(square);
  
  return table[adjustedSquare] ?? 0;
}

/**
 * Check if position is in endgame (simplified heuristic)
 */
function isEndgame(board: Board): boolean {
  let queenCount = 0;
  let minorMajorCount = 0;
  
  for (const piece of board) {
    if (piece === null) continue;
    if (piece.type === PieceType.QUEEN) queenCount++;
    if (piece.type === PieceType.ROOK || 
        piece.type === PieceType.BISHOP || 
        piece.type === PieceType.KNIGHT) {
      minorMajorCount++;
    }
  }
  
  // Endgame if no queens or queen + minimal pieces
  return queenCount === 0 || (queenCount <= 2 && minorMajorCount <= 2);
}

/**
 * Evaluate material balance
 */
export function evaluateMaterial(board: Board): number {
  let score = 0;
  
  for (const piece of board) {
    if (piece === null) continue;
    const value = PIECE_VALUES[piece.type];
    score += piece.color === ColorEnum.WHITE ? value : -value;
  }
  
  return score;
}

/**
 * Evaluate piece positioning using piece-square tables
 */
export function evaluatePositioning(board: Board): number {
  let score = 0;
  const endgame = isEndgame(board);
  
  for (let square = 0; square < 64; square++) {
    const piece = board[square];
    if (piece === null) continue;
    
    const pstValue = getPstValue(piece, square, endgame);
    score += piece.color === ColorEnum.WHITE ? pstValue : -pstValue;
  }
  
  return score;
}

/**
 * Evaluate mobility (number of legal moves)
 */
export function evaluateMobility(position: Position): number {
  const currentMoves = generateLegalMoves(position);
  
  // Create opponent's position to count their moves
  const opponentPosition: Position = {
    ...position,
    sideToMove: position.sideToMove === ColorEnum.WHITE ? ColorEnum.BLACK : ColorEnum.WHITE,
  };
  const opponentMoves = generateLegalMoves(opponentPosition);
  
  const mobilityDiff = currentMoves.length - opponentMoves.length;
  
  // Scale mobility (each extra move worth about 5 centipawns)
  return position.sideToMove === ColorEnum.WHITE 
    ? mobilityDiff * 5 
    : -mobilityDiff * 5;
}

/**
 * Evaluate king safety
 */
export function evaluateKingSafety(position: Position): number {
  const { board } = position;
  let score = 0;
  
  for (const color of [ColorEnum.WHITE, ColorEnum.BLACK]) {
    const kingSquare = findKing(board, color);
    const kingFile = getFile(kingSquare);
    const kingRank = getRank(kingSquare);
    const enemyColor = color === ColorEnum.WHITE ? ColorEnum.BLACK : ColorEnum.WHITE;
    
    // Penalty for exposed king (not castled in middlegame)
    if (!isEndgame(board)) {
      // Bonus for castled position (king on g or h file, or b or c file)
      const isCastled = (kingFile >= 6 || kingFile <= 1) && kingRank === (color === ColorEnum.WHITE ? 0 : 7);
      if (isCastled) {
        score += color === ColorEnum.WHITE ? 30 : -30;
      }
      
      // Penalty for king in center
      if (kingFile >= 3 && kingFile <= 4 && kingRank === (color === ColorEnum.WHITE ? 0 : 7)) {
        score += color === ColorEnum.WHITE ? -20 : 20;
      }
    }
    
    // Count attacks near king
    let attacksNearKing = 0;
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        const nearFile = kingFile + df;
        const nearRank = kingRank + dr;
        if (nearFile < 0 || nearFile > 7 || nearRank < 0 || nearRank > 7) continue;
        
        const nearSquare = toSquareIndex(nearFile, nearRank);
        if (isSquareAttacked(board, nearSquare, enemyColor)) {
          attacksNearKing++;
        }
      }
    }
    
    // Penalty for attacks near king
    score += color === ColorEnum.WHITE ? -attacksNearKing * 10 : attacksNearKing * 10;
  }
  
  return score;
}

/**
 * Evaluate center control
 */
export function evaluateCenterControl(position: Position): number {
  const { board } = position;
  const centerSquares = [
    toSquareIndex(3, 3), // d4
    toSquareIndex(4, 3), // e4
    toSquareIndex(3, 4), // d5
    toSquareIndex(4, 4), // e5
  ];
  
  const extendedCenter = [
    toSquareIndex(2, 2), toSquareIndex(3, 2), toSquareIndex(4, 2), toSquareIndex(5, 2),
    toSquareIndex(2, 3), toSquareIndex(5, 3),
    toSquareIndex(2, 4), toSquareIndex(5, 4),
    toSquareIndex(2, 5), toSquareIndex(3, 5), toSquareIndex(4, 5), toSquareIndex(5, 5),
  ];
  
  let score = 0;
  
  // Pieces in center
  for (const square of centerSquares) {
    const piece = board[square];
    if (piece !== null && piece.type !== PieceType.KING) {
      score += piece.color === ColorEnum.WHITE ? 15 : -15;
    }
    
    // Control of center squares
    if (isSquareAttacked(board, square, ColorEnum.WHITE)) score += 5;
    if (isSquareAttacked(board, square, ColorEnum.BLACK)) score -= 5;
  }
  
  // Extended center
  for (const square of extendedCenter) {
    const piece = board[square];
    if (piece !== null && piece.type !== PieceType.KING && piece.type !== PieceType.PAWN) {
      score += piece.color === ColorEnum.WHITE ? 5 : -5;
    }
  }
  
  return score;
}

/**
 * Evaluate pawn structure
 */
export function evaluatePawnStructure(board: Board): number {
  let score = 0;
  
  // Track pawns by file for each color
  const whitePawnFiles: number[] = [];
  const blackPawnFiles: number[] = [];
  
  for (let square = 0; square < 64; square++) {
    const piece = board[square];
    if (piece?.type !== PieceType.PAWN) continue;
    
    const file = getFile(square);
    if (piece.color === ColorEnum.WHITE) {
      whitePawnFiles.push(file);
    } else {
      blackPawnFiles.push(file);
    }
  }
  
  // Doubled pawns penalty
  for (let file = 0; file < 8; file++) {
    const whiteOnFile = whitePawnFiles.filter(f => f === file).length;
    const blackOnFile = blackPawnFiles.filter(f => f === file).length;
    
    if (whiteOnFile > 1) score -= (whiteOnFile - 1) * 20;
    if (blackOnFile > 1) score += (blackOnFile - 1) * 20;
  }
  
  // Isolated pawns penalty
  for (const file of whitePawnFiles) {
    const hasNeighbor = whitePawnFiles.some(f => f === file - 1 || f === file + 1);
    if (!hasNeighbor) score -= 15;
  }
  
  for (const file of blackPawnFiles) {
    const hasNeighbor = blackPawnFiles.some(f => f === file - 1 || f === file + 1);
    if (!hasNeighbor) score += 15;
  }
  
  return score;
}

/**
 * Evaluate piece activity (developed pieces, connected rooks, etc.)
 */
export function evaluatePieceActivity(board: Board): number {
  let score = 0;
  
  // Bishop pair bonus
  const whiteBishops = getPiecesForColor(board, ColorEnum.WHITE)
    .filter(p => p.piece.type === PieceType.BISHOP);
  const blackBishops = getPiecesForColor(board, ColorEnum.BLACK)
    .filter(p => p.piece.type === PieceType.BISHOP);
  
  if (whiteBishops.length >= 2) score += 30;
  if (blackBishops.length >= 2) score -= 30;
  
  // Rook on open file bonus
  for (let file = 0; file < 8; file++) {
    let hasPawn = false;
    let whiteRookOnFile = false;
    let blackRookOnFile = false;
    
    for (let rank = 0; rank < 8; rank++) {
      const square = toSquareIndex(file, rank);
      const piece = board[square];
      
      if (piece?.type === PieceType.PAWN) hasPawn = true;
      if (piece?.type === PieceType.ROOK) {
        if (piece.color === ColorEnum.WHITE) whiteRookOnFile = true;
        else blackRookOnFile = true;
      }
    }
    
    if (!hasPawn) {
      if (whiteRookOnFile) score += 20;
      if (blackRookOnFile) score -= 20;
    }
  }
  
  return score;
}

// ============================================================================
// MAIN EVALUATION FUNCTION
// ============================================================================

/** Checkmate score (high but not infinity for search purposes) */
export const MATE_SCORE = 100000;

/** Score indicating a draw */
export const DRAW_SCORE = 0;

/**
 * Main evaluation function - evaluates position from White's perspective
 * Returns score in centipawns
 */
export function evaluate(position: Position): number {
  const { board } = position;
  
  // Check for checkmate/stalemate
  const legalMoves = generateLegalMoves(position);
  if (legalMoves.length === 0) {
    // Stalemate
    if (!isInCheckSimple(position)) {
      return DRAW_SCORE;
    }
    // Checkmate - bad for side to move
    return position.sideToMove === ColorEnum.WHITE ? -MATE_SCORE : MATE_SCORE;
  }
  
  // Sum all evaluation components
  const material = evaluateMaterial(board);
  const positioning = evaluatePositioning(board);
  const mobility = evaluateMobility(position);
  const kingSafety = evaluateKingSafety(position);
  const centerControl = evaluateCenterControl(position);
  const pawnStructure = evaluatePawnStructure(board);
  const pieceActivity = evaluatePieceActivity(board);
  
  return material + positioning + mobility + kingSafety + centerControl + pawnStructure + pieceActivity;
}

/**
 * Get evaluation breakdown for explainable AI
 */
export function getEvaluationBreakdown(position: Position): EvaluationBreakdown {
  const { board } = position;
  
  return {
    material: evaluateMaterial(board),
    mobility: evaluateMobility(position),
    kingSafety: evaluateKingSafety(position),
    centerControl: evaluateCenterControl(position),
    pawnStructure: evaluatePawnStructure(board),
    pieceActivity: evaluatePieceActivity(board) + evaluatePositioning(board),
  };
}

/**
 * Simple check detection to avoid circular dependency
 */
function isInCheckSimple(position: Position): boolean {
  const { board, sideToMove } = position;
  const kingSquare = findKing(board, sideToMove);
  const enemyColor = sideToMove === ColorEnum.WHITE ? ColorEnum.BLACK : ColorEnum.WHITE;
  return isSquareAttacked(board, kingSquare, enemyColor);
}
