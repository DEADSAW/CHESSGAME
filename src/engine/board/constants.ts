/**
 * Chess Master Pro - Board Constants and Square Utilities
 * 
 * This module provides constants for board representation and utility functions
 * for converting between different square representations.
 */

import type { File, Rank, SquareIndex, SquareNotation } from '../../types';

// ============================================================================
// BOARD CONSTANTS
// ============================================================================

export const BOARD_SIZE = 8;
export const NUM_SQUARES = 64;

/** All files in order */
export const FILES: readonly File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** All ranks in order */
export const RANKS: readonly Rank[] = ['1', '2', '3', '4', '5', '6', '7', '8'];

/** File index lookup */
export const FILE_INDEX: Record<File, number> = {
  a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7,
};

/** Rank index lookup */
export const RANK_INDEX: Record<Rank, number> = {
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7,
};

// ============================================================================
// SQUARE CONVERSION UTILITIES
// ============================================================================

/**
 * Convert file and rank indices to square index
 * @param file File index (0-7, where 0=a)
 * @param rank Rank index (0-7, where 0=1)
 */
export function toSquareIndex(file: number, rank: number): SquareIndex {
  return rank * 8 + file;
}

/**
 * Convert square index to file index
 * @param square Square index (0-63)
 */
export function getFile(square: SquareIndex): number {
  return square % 8;
}

/**
 * Convert square index to rank index
 * @param square Square index (0-63)
 */
export function getRank(square: SquareIndex): number {
  return Math.floor(square / 8);
}

/**
 * Convert square notation (e.g., "e4") to square index
 * @param notation Standard algebraic notation
 */
export function notationToIndex(notation: SquareNotation): SquareIndex {
  const file = FILE_INDEX[notation[0] as File];
  const rank = RANK_INDEX[notation[1] as Rank];
  if (file === undefined || rank === undefined) {
    throw new Error(`Invalid square notation: ${notation}`);
  }
  return toSquareIndex(file, rank);
}

/**
 * Convert square index to square notation
 * @param index Square index (0-63)
 */
export function indexToNotation(index: SquareIndex): SquareNotation {
  const file = FILES[getFile(index)];
  const rank = RANKS[getRank(index)];
  if (file === undefined || rank === undefined) {
    throw new Error(`Invalid square index: ${index}`);
  }
  return `${file}${rank}` as SquareNotation;
}

/**
 * Check if a square index is valid
 * @param index Square index to validate
 */
export function isValidSquare(index: number): index is SquareIndex {
  return Number.isInteger(index) && index >= 0 && index < 64;
}

/**
 * Check if file and rank indices are valid
 * @param file File index
 * @param rank Rank index
 */
export function isValidFileRank(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

/**
 * Get the color of a square (for rendering)
 * @param index Square index
 * @returns 'light' or 'dark'
 */
export function getSquareColor(index: SquareIndex): 'light' | 'dark' {
  const file = getFile(index);
  const rank = getRank(index);
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

/**
 * Check if a square is light colored
 * @param file File index (0-7)
 * @param rank Rank index (0-7)
 */
export function isLightSquare(file: number, rank: number): boolean {
  return (file + rank) % 2 !== 0;
}

// ============================================================================
// IMPORTANT SQUARE INDICES
// ============================================================================

/** Starting positions for kings */
export const KING_START = {
  WHITE: notationToIndex('e1'),
  BLACK: notationToIndex('e8'),
} as const;

/** Starting positions for rooks */
export const ROOK_START = {
  WHITE_KINGSIDE: notationToIndex('h1'),
  WHITE_QUEENSIDE: notationToIndex('a1'),
  BLACK_KINGSIDE: notationToIndex('h8'),
  BLACK_QUEENSIDE: notationToIndex('a8'),
} as const;

/** Castling destination squares for kings */
export const CASTLING_KING_DEST = {
  WHITE_KINGSIDE: notationToIndex('g1'),
  WHITE_QUEENSIDE: notationToIndex('c1'),
  BLACK_KINGSIDE: notationToIndex('g8'),
  BLACK_QUEENSIDE: notationToIndex('c8'),
} as const;

/** Castling destination squares for rooks */
export const CASTLING_ROOK_DEST = {
  WHITE_KINGSIDE: notationToIndex('f1'),
  WHITE_QUEENSIDE: notationToIndex('d1'),
  BLACK_KINGSIDE: notationToIndex('f8'),
  BLACK_QUEENSIDE: notationToIndex('d8'),
} as const;

/** Squares the king passes through during castling (must not be attacked) */
export const CASTLING_PATH = {
  WHITE_KINGSIDE: [notationToIndex('f1'), notationToIndex('g1')],
  WHITE_QUEENSIDE: [notationToIndex('d1'), notationToIndex('c1')],
  BLACK_KINGSIDE: [notationToIndex('f8'), notationToIndex('g8')],
  BLACK_QUEENSIDE: [notationToIndex('d8'), notationToIndex('c8')],
} as const;

/** Squares that must be empty for castling */
export const CASTLING_EMPTY = {
  WHITE_KINGSIDE: [notationToIndex('f1'), notationToIndex('g1')],
  WHITE_QUEENSIDE: [notationToIndex('b1'), notationToIndex('c1'), notationToIndex('d1')],
  BLACK_KINGSIDE: [notationToIndex('f8'), notationToIndex('g8')],
  BLACK_QUEENSIDE: [notationToIndex('b8'), notationToIndex('c8'), notationToIndex('d8')],
} as const;

// ============================================================================
// DIRECTION VECTORS
// ============================================================================

/** Direction offsets for piece movement (delta to square index) */
export const DIRECTION = {
  NORTH: 8,
  SOUTH: -8,
  EAST: 1,
  WEST: -1,
  NORTH_EAST: 9,
  NORTH_WEST: 7,
  SOUTH_EAST: -7,
  SOUTH_WEST: -9,
} as const;

/** Knight move offsets */
export const KNIGHT_MOVES = [
  DIRECTION.NORTH + DIRECTION.NORTH + DIRECTION.EAST,  // +17
  DIRECTION.NORTH + DIRECTION.NORTH + DIRECTION.WEST,  // +15
  DIRECTION.SOUTH + DIRECTION.SOUTH + DIRECTION.EAST,  // -15
  DIRECTION.SOUTH + DIRECTION.SOUTH + DIRECTION.WEST,  // -17
  DIRECTION.EAST + DIRECTION.EAST + DIRECTION.NORTH,   // +10
  DIRECTION.EAST + DIRECTION.EAST + DIRECTION.SOUTH,   // -6
  DIRECTION.WEST + DIRECTION.WEST + DIRECTION.NORTH,   // +6
  DIRECTION.WEST + DIRECTION.WEST + DIRECTION.SOUTH,   // -10
] as const;

/** King move offsets (all adjacent squares) */
export const KING_MOVES = [
  DIRECTION.NORTH,
  DIRECTION.SOUTH,
  DIRECTION.EAST,
  DIRECTION.WEST,
  DIRECTION.NORTH_EAST,
  DIRECTION.NORTH_WEST,
  DIRECTION.SOUTH_EAST,
  DIRECTION.SOUTH_WEST,
] as const;

/** Sliding piece directions */
export const ROOK_DIRECTIONS = [
  DIRECTION.NORTH,
  DIRECTION.SOUTH,
  DIRECTION.EAST,
  DIRECTION.WEST,
] as const;

export const BISHOP_DIRECTIONS = [
  DIRECTION.NORTH_EAST,
  DIRECTION.NORTH_WEST,
  DIRECTION.SOUTH_EAST,
  DIRECTION.SOUTH_WEST,
] as const;

export const QUEEN_DIRECTIONS = [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS] as const;
