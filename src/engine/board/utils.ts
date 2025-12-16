/**
 * Chess Master Pro - Board Utilities
 * 
 * Provides functions for creating and manipulating chess board state.
 */

import type { Board, MutableBoard, Piece, Color, SquareIndex, Position, MutablePosition, CastlingRights } from '../../types';
import { PieceType, Color as ColorEnum } from '../../types';
import { NUM_SQUARES, toSquareIndex } from './constants';

// ============================================================================
// BOARD CREATION
// ============================================================================

/**
 * Create an empty board (all squares null)
 */
export function createEmptyBoard(): MutableBoard {
  return new Array<null>(NUM_SQUARES).fill(null);
}

/**
 * Create the standard starting position board
 */
export function createStartingBoard(): MutableBoard {
  const board = createEmptyBoard();
  
  // White pieces (rank 1)
  board[toSquareIndex(0, 0)] = { type: PieceType.ROOK, color: ColorEnum.WHITE };
  board[toSquareIndex(1, 0)] = { type: PieceType.KNIGHT, color: ColorEnum.WHITE };
  board[toSquareIndex(2, 0)] = { type: PieceType.BISHOP, color: ColorEnum.WHITE };
  board[toSquareIndex(3, 0)] = { type: PieceType.QUEEN, color: ColorEnum.WHITE };
  board[toSquareIndex(4, 0)] = { type: PieceType.KING, color: ColorEnum.WHITE };
  board[toSquareIndex(5, 0)] = { type: PieceType.BISHOP, color: ColorEnum.WHITE };
  board[toSquareIndex(6, 0)] = { type: PieceType.KNIGHT, color: ColorEnum.WHITE };
  board[toSquareIndex(7, 0)] = { type: PieceType.ROOK, color: ColorEnum.WHITE };
  
  // White pawns (rank 2)
  for (let file = 0; file < 8; file++) {
    board[toSquareIndex(file, 1)] = { type: PieceType.PAWN, color: ColorEnum.WHITE };
  }
  
  // Black pawns (rank 7)
  for (let file = 0; file < 8; file++) {
    board[toSquareIndex(file, 6)] = { type: PieceType.PAWN, color: ColorEnum.BLACK };
  }
  
  // Black pieces (rank 8)
  board[toSquareIndex(0, 7)] = { type: PieceType.ROOK, color: ColorEnum.BLACK };
  board[toSquareIndex(1, 7)] = { type: PieceType.KNIGHT, color: ColorEnum.BLACK };
  board[toSquareIndex(2, 7)] = { type: PieceType.BISHOP, color: ColorEnum.BLACK };
  board[toSquareIndex(3, 7)] = { type: PieceType.QUEEN, color: ColorEnum.BLACK };
  board[toSquareIndex(4, 7)] = { type: PieceType.KING, color: ColorEnum.BLACK };
  board[toSquareIndex(5, 7)] = { type: PieceType.BISHOP, color: ColorEnum.BLACK };
  board[toSquareIndex(6, 7)] = { type: PieceType.KNIGHT, color: ColorEnum.BLACK };
  board[toSquareIndex(7, 7)] = { type: PieceType.ROOK, color: ColorEnum.BLACK };
  
  return board;
}

/**
 * Clone a board
 */
export function cloneBoard(board: Board): MutableBoard {
  return [...board];
}

/**
 * Get piece at a square
 */
export function getPiece(board: Board, square: SquareIndex): Piece | null {
  return board[square] ?? null;
}

/**
 * Set piece at a square (returns new board)
 */
export function setPiece(board: Board, square: SquareIndex, piece: Piece | null): MutableBoard {
  const newBoard = cloneBoard(board);
  newBoard[square] = piece;
  return newBoard;
}

/**
 * Check if a square is empty
 */
export function isEmpty(board: Board, square: SquareIndex): boolean {
  return board[square] === null;
}

/**
 * Check if a square contains an enemy piece
 */
export function isEnemy(board: Board, square: SquareIndex, color: Color): boolean {
  const piece = board[square];
  return piece !== null && piece.color !== color;
}

/**
 * Check if a square contains a friendly piece
 */
export function isFriendly(board: Board, square: SquareIndex, color: Color): boolean {
  const piece = board[square];
  return piece !== null && piece.color === color;
}

/**
 * Find all squares containing a specific piece type and color
 */
export function findPieces(board: Board, type: PieceType, color: Color): SquareIndex[] {
  const squares: SquareIndex[] = [];
  for (let i = 0; i < NUM_SQUARES; i++) {
    const piece = board[i];
    if (piece !== null && piece.type === type && piece.color === color) {
      squares.push(i);
    }
  }
  return squares;
}

/**
 * Find the king for a given color
 */
export function findKing(board: Board, color: Color): SquareIndex {
  for (let i = 0; i < NUM_SQUARES; i++) {
    const piece = board[i];
    if (piece !== null && piece.type === PieceType.KING && piece.color === color) {
      return i;
    }
  }
  throw new Error(`King not found for ${color}`);
}

/**
 * Get all pieces for a color
 */
export function getPiecesForColor(board: Board, color: Color): Array<{ piece: Piece; square: SquareIndex }> {
  const pieces: Array<{ piece: Piece; square: SquareIndex }> = [];
  for (let i = 0; i < NUM_SQUARES; i++) {
    const piece = board[i];
    if (piece !== null && piece.color === color) {
      pieces.push({ piece, square: i });
    }
  }
  return pieces;
}

// ============================================================================
// POSITION UTILITIES
// ============================================================================

/**
 * Create the standard starting position
 */
export function createStartingPosition(): Position {
  return {
    board: createStartingBoard(),
    sideToMove: ColorEnum.WHITE,
    castlingRights: {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    },
    enPassantSquare: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

/**
 * Clone a position
 */
export function clonePosition(position: Position): MutablePosition {
  return {
    board: cloneBoard(position.board),
    sideToMove: position.sideToMove,
    castlingRights: { ...position.castlingRights },
    enPassantSquare: position.enPassantSquare,
    halfmoveClock: position.halfmoveClock,
    fullmoveNumber: position.fullmoveNumber,
  };
}

/**
 * Get the opposite color
 */
export function oppositeColor(color: Color): Color {
  return color === ColorEnum.WHITE ? ColorEnum.BLACK : ColorEnum.WHITE;
}

/**
 * Update castling rights after a move
 */
export function updateCastlingRights(
  rights: CastlingRights,
  from: SquareIndex,
  to: SquareIndex
): CastlingRights {
  let { whiteKingside, whiteQueenside, blackKingside, blackQueenside } = rights;
  
  // King moves - lose all castling rights for that color
  if (from === toSquareIndex(4, 0)) {
    whiteKingside = false;
    whiteQueenside = false;
  }
  if (from === toSquareIndex(4, 7)) {
    blackKingside = false;
    blackQueenside = false;
  }
  
  // Rook moves or captures
  if (from === toSquareIndex(0, 0) || to === toSquareIndex(0, 0)) {
    whiteQueenside = false;
  }
  if (from === toSquareIndex(7, 0) || to === toSquareIndex(7, 0)) {
    whiteKingside = false;
  }
  if (from === toSquareIndex(0, 7) || to === toSquareIndex(0, 7)) {
    blackQueenside = false;
  }
  if (from === toSquareIndex(7, 7) || to === toSquareIndex(7, 7)) {
    blackKingside = false;
  }
  
  return { whiteKingside, whiteQueenside, blackKingside, blackQueenside };
}
