/**
 * Chess Master Pro - Zobrist Hashing
 * 
 * Zobrist hashing provides a fast way to generate unique hash keys for chess positions.
 * These keys are used in the transposition table to detect positions we've seen before.
 * 
 * The hash is computed by XOR-ing random numbers for:
 * - Each piece on each square (12 pieces × 64 squares = 768 numbers)
 * - Side to move
 * - Castling rights (4 numbers)
 * - En passant file (8 numbers)
 */

import type { Position, ZobristHash, Color, PieceType as PieceTypeT } from '../../types';
import { PieceType, Color as ColorEnum } from '../../types';

// ============================================================================
// RANDOM NUMBER GENERATION
// ============================================================================

/**
 * Simple seeded PRNG for reproducible random numbers
 * Uses a Linear Congruential Generator (LCG)
 */
class SeededRandom {
  private state: bigint;
  
  constructor(seed: number) {
    this.state = BigInt(seed);
  }
  
  nextBigInt(): bigint {
    // Using constants from Numerical Recipes
    const a = 6364136223846793005n;
    const c = 1442695040888963407n;
    const m = 1n << 64n;
    
    this.state = (a * this.state + c) % m;
    return this.state;
  }
}

// ============================================================================
// ZOBRIST KEYS
// ============================================================================

/** Piece type to index mapping */
const PIECE_INDEX: Record<PieceTypeT, number> = {
  [PieceType.PAWN]: 0,
  [PieceType.KNIGHT]: 1,
  [PieceType.BISHOP]: 2,
  [PieceType.ROOK]: 3,
  [PieceType.QUEEN]: 4,
  [PieceType.KING]: 5,
};

/** Color offset for piece index */
const COLOR_OFFSET: Record<Color, number> = {
  [ColorEnum.WHITE]: 0,
  [ColorEnum.BLACK]: 6,
};

/**
 * Zobrist key tables - initialized once
 */
class ZobristKeys {
  /** Random numbers for each piece on each square [square][pieceIndex] */
  readonly pieceSquare: bigint[][];
  
  /** Random number for black to move */
  readonly blackToMove: bigint;
  
  /** Random numbers for castling rights [index 0-3] */
  readonly castling: bigint[];
  
  /** Random numbers for en passant file [file 0-7] */
  readonly enPassant: bigint[];
  
  constructor(seed: number = 12345) {
    const rng = new SeededRandom(seed);
    
    // Initialize piece-square table
    this.pieceSquare = [];
    for (let square = 0; square < 64; square++) {
      this.pieceSquare[square] = [];
      for (let pieceIdx = 0; pieceIdx < 12; pieceIdx++) {
        this.pieceSquare[square][pieceIdx] = rng.nextBigInt();
      }
    }
    
    // Side to move
    this.blackToMove = rng.nextBigInt();
    
    // Castling rights
    this.castling = [];
    for (let i = 0; i < 4; i++) {
      this.castling[i] = rng.nextBigInt();
    }
    
    // En passant files
    this.enPassant = [];
    for (let i = 0; i < 8; i++) {
      this.enPassant[i] = rng.nextBigInt();
    }
  }
  
  /**
   * Get the piece index for a piece (0-11)
   */
  getPieceIndex(type: PieceTypeT, color: Color): number {
    return PIECE_INDEX[type] + COLOR_OFFSET[color];
  }
}

// Global instance of Zobrist keys
export const zobristKeys = new ZobristKeys();

// ============================================================================
// HASH COMPUTATION
// ============================================================================

/**
 * Compute the Zobrist hash for a position
 */
export function computeHash(position: Position): ZobristHash {
  let hash = 0n;
  const { board, sideToMove, castlingRights, enPassantSquare } = position;
  
  // Hash pieces on squares
  for (let square = 0; square < 64; square++) {
    const piece = board[square];
    if (piece !== null) {
      const pieceIdx = zobristKeys.getPieceIndex(piece.type, piece.color);
      const squareKeys = zobristKeys.pieceSquare[square];
      if (squareKeys !== undefined) {
        const key = squareKeys[pieceIdx];
        if (key !== undefined) {
          hash ^= key;
        }
      }
    }
  }
  
  // Hash side to move
  if (sideToMove === ColorEnum.BLACK) {
    hash ^= zobristKeys.blackToMove;
  }
  
  // Hash castling rights
  if (castlingRights.whiteKingside) {
    const key = zobristKeys.castling[0];
    if (key !== undefined) hash ^= key;
  }
  if (castlingRights.whiteQueenside) {
    const key = zobristKeys.castling[1];
    if (key !== undefined) hash ^= key;
  }
  if (castlingRights.blackKingside) {
    const key = zobristKeys.castling[2];
    if (key !== undefined) hash ^= key;
  }
  if (castlingRights.blackQueenside) {
    const key = zobristKeys.castling[3];
    if (key !== undefined) hash ^= key;
  }
  
  // Hash en passant file (only if en passant is possible)
  if (enPassantSquare !== null) {
    const file = enPassantSquare % 8;
    const key = zobristKeys.enPassant[file];
    if (key !== undefined) hash ^= key;
  }
  
  return hash;
}

/**
 * Incrementally update hash after a move
 * This is faster than recomputing the full hash
 */
export function updateHashForMove(
  hash: ZobristHash,
  fromSquare: number,
  toSquare: number,
  piece: { type: PieceTypeT; color: Color },
  captured: { type: PieceTypeT; color: Color } | null,
  oldEnPassant: number | null,
  newEnPassant: number | null,
  oldCastling: {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
  },
  newCastling: {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
  }
): ZobristHash {
  let newHash = hash;
  
  const pieceIdx = zobristKeys.getPieceIndex(piece.type, piece.color);
  
  // Remove piece from source square
  const fromKeys = zobristKeys.pieceSquare[fromSquare];
  if (fromKeys !== undefined) {
    const fromKey = fromKeys[pieceIdx];
    if (fromKey !== undefined) newHash ^= fromKey;
  }
  
  // Add piece to destination square
  const toKeys = zobristKeys.pieceSquare[toSquare];
  if (toKeys !== undefined) {
    const toKey = toKeys[pieceIdx];
    if (toKey !== undefined) newHash ^= toKey;
  }
  
  // Remove captured piece
  if (captured !== null) {
    const capturedIdx = zobristKeys.getPieceIndex(captured.type, captured.color);
    const capturedKeys = zobristKeys.pieceSquare[toSquare];
    if (capturedKeys !== undefined) {
      const capturedKey = capturedKeys[capturedIdx];
      if (capturedKey !== undefined) newHash ^= capturedKey;
    }
  }
  
  // Toggle side to move
  newHash ^= zobristKeys.blackToMove;
  
  // Update en passant
  if (oldEnPassant !== null) {
    const key = zobristKeys.enPassant[oldEnPassant % 8];
    if (key !== undefined) newHash ^= key;
  }
  if (newEnPassant !== null) {
    const key = zobristKeys.enPassant[newEnPassant % 8];
    if (key !== undefined) newHash ^= key;
  }
  
  // Update castling rights
  if (oldCastling.whiteKingside !== newCastling.whiteKingside) {
    const key = zobristKeys.castling[0];
    if (key !== undefined) newHash ^= key;
  }
  if (oldCastling.whiteQueenside !== newCastling.whiteQueenside) {
    const key = zobristKeys.castling[1];
    if (key !== undefined) newHash ^= key;
  }
  if (oldCastling.blackKingside !== newCastling.blackKingside) {
    const key = zobristKeys.castling[2];
    if (key !== undefined) newHash ^= key;
  }
  if (oldCastling.blackQueenside !== newCastling.blackQueenside) {
    const key = zobristKeys.castling[3];
    if (key !== undefined) newHash ^= key;
  }
  
  return newHash;
}
