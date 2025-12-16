/**
 * Chess Master Pro - FEN Parser and Generator
 * 
 * FEN (Forsyth-Edwards Notation) is the standard notation for describing
 * a chess position. This module handles parsing and generating FEN strings.
 * 
 * FEN format: [pieces] [side] [castling] [en-passant] [halfmove] [fullmove]
 * Example: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
 */

import type { Position, MutableBoard, Piece, Color, CastlingRights, SquareIndex, PieceType as PieceTypeT } from '../../types';
import { PieceType, Color as ColorEnum } from '../../types';
import { createEmptyBoard, createStartingPosition } from './utils';
import { toSquareIndex, notationToIndex, indexToNotation, FILES, RANKS } from './constants';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Standard starting position FEN */
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** FEN piece characters */
const PIECE_CHARS: Record<string, { type: PieceTypeT; color: Color }> = {
  'P': { type: PieceType.PAWN, color: ColorEnum.WHITE },
  'N': { type: PieceType.KNIGHT, color: ColorEnum.WHITE },
  'B': { type: PieceType.BISHOP, color: ColorEnum.WHITE },
  'R': { type: PieceType.ROOK, color: ColorEnum.WHITE },
  'Q': { type: PieceType.QUEEN, color: ColorEnum.WHITE },
  'K': { type: PieceType.KING, color: ColorEnum.WHITE },
  'p': { type: PieceType.PAWN, color: ColorEnum.BLACK },
  'n': { type: PieceType.KNIGHT, color: ColorEnum.BLACK },
  'b': { type: PieceType.BISHOP, color: ColorEnum.BLACK },
  'r': { type: PieceType.ROOK, color: ColorEnum.BLACK },
  'q': { type: PieceType.QUEEN, color: ColorEnum.BLACK },
  'k': { type: PieceType.KING, color: ColorEnum.BLACK },
};

/** Reverse mapping for generating FEN */
const PIECE_TO_CHAR: Record<Color, Record<PieceTypeT, string>> = {
  [ColorEnum.WHITE]: {
    [PieceType.PAWN]: 'P',
    [PieceType.KNIGHT]: 'N',
    [PieceType.BISHOP]: 'B',
    [PieceType.ROOK]: 'R',
    [PieceType.QUEEN]: 'Q',
    [PieceType.KING]: 'K',
  },
  [ColorEnum.BLACK]: {
    [PieceType.PAWN]: 'p',
    [PieceType.KNIGHT]: 'n',
    [PieceType.BISHOP]: 'b',
    [PieceType.ROOK]: 'r',
    [PieceType.QUEEN]: 'q',
    [PieceType.KING]: 'k',
  },
};

// ============================================================================
// FEN PARSING
// ============================================================================

/**
 * Parse a FEN string into a Position object
 * @param fen FEN string
 * @returns Position object
 * @throws Error if FEN is invalid
 */
export function parseFen(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  
  if (parts.length < 4) {
    throw new Error(`Invalid FEN: expected at least 4 parts, got ${parts.length}`);
  }
  
  const [piecePlacement, sideToMove, castling, enPassant, halfmove, fullmove] = parts;
  
  // Parse piece placement
  const board = parsePiecePlacement(piecePlacement ?? '');
  
  // Parse side to move / castling / en passant
  const side = parseSideToMove(sideToMove ?? '');
  const castlingRights = parseCastlingRights(castling ?? '-');
  const enPassantSquare = parseEnPassant(enPassant ?? '-');

  // Parse halfmove clock (default to 0)
  const halfmoveClock = halfmove !== undefined ? parseInt(halfmove, 10) : 0;
  if (isNaN(halfmoveClock) || halfmoveClock < 0) {
    throw new Error(`Invalid halfmove clock: ${halfmove ?? 'undefined'}`);
  }
  
  // Parse fullmove number (default to 1)
  const fullmoveNumber = fullmove !== undefined ? parseInt(fullmove, 10) : 1;
  if (isNaN(fullmoveNumber) || fullmoveNumber < 1) {
    throw new Error(`Invalid fullmove number: ${fullmove ?? 'undefined'}`);
  }
  
  return {
    board,
    sideToMove: side,
    castlingRights,
    enPassantSquare,
    halfmoveClock,
    fullmoveNumber,
  };
}

/**
 * Parse the piece placement part of FEN
 */
function parsePiecePlacement(placement: string): MutableBoard {
  const board = createEmptyBoard();
  const ranks = placement.split('/');
  
  if (ranks.length !== 8) {
    throw new Error(`Invalid piece placement: expected 8 ranks, got ${ranks.length}`);
  }
  
  for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
    // FEN ranks are in reverse order (rank 8 first)
    const rankStr = ranks[7 - rankIdx];
    if (rankStr === undefined) continue;
    
    let fileIdx = 0;
    
    for (const char of rankStr) {
      if (fileIdx >= 8) {
        throw new Error(`Invalid piece placement: too many squares in rank ${8 - rankIdx}`);
      }
      
      // Check if it's a digit (empty squares)
      const digit = parseInt(char, 10);
      if (!isNaN(digit)) {
        if (digit < 1 || digit > 8) {
          throw new Error(`Invalid empty square count: ${digit}`);
        }
        fileIdx += digit;
        continue;
      }
      
      // Check if it's a piece character
      const pieceInfo = PIECE_CHARS[char];
      if (pieceInfo === undefined) {
        throw new Error(`Invalid piece character: ${char}`);
      }
      
      const square = toSquareIndex(fileIdx, rankIdx);
      board[square] = { type: pieceInfo.type, color: pieceInfo.color };
      fileIdx++;
    }
    
    if (fileIdx !== 8) {
      throw new Error(`Invalid piece placement: rank ${8 - rankIdx} has ${fileIdx} squares`);
    }
  }
  
  return board;
}

/**
 * Parse the side to move
 */
function parseSideToMove(side: string): Color {
  if (side === 'w') return ColorEnum.WHITE;
  if (side === 'b') return ColorEnum.BLACK;
  throw new Error(`Invalid side to move: ${side}`);
}

/**
 * Parse castling rights
 */
function parseCastlingRights(castling: string): CastlingRights {
  if (castling === '-') {
    return {
      whiteKingside: false,
      whiteQueenside: false,
      blackKingside: false,
      blackQueenside: false,
    };
  }
  
  return {
    whiteKingside: castling.includes('K'),
    whiteQueenside: castling.includes('Q'),
    blackKingside: castling.includes('k'),
    blackQueenside: castling.includes('q'),
  };
}

/**
 * Parse en passant square
 */
function parseEnPassant(ep: string): SquareIndex | null {
  if (ep === '-') return null;
  
  if (ep.length !== 2) {
    throw new Error(`Invalid en passant square: ${ep}`);
  }
  
  try {
    return notationToIndex(ep as `${typeof FILES[number]}${typeof RANKS[number]}`);
  } catch {
    throw new Error(`Invalid en passant square: ${ep}`);
  }
}

// ============================================================================
// FEN GENERATION
// ============================================================================

/**
 * Generate a FEN string from a Position object
 * @param position Position object
 * @returns FEN string
 */
export function toFen(position: Position): string {
  const parts: string[] = [];
  
  // Piece placement
  parts.push(generatePiecePlacement(position.board));
  
  // Side to move
  parts.push(position.sideToMove);
  
  // Castling rights
  parts.push(generateCastlingRights(position.castlingRights));
  
  // En passant square
  parts.push(position.enPassantSquare !== null ? indexToNotation(position.enPassantSquare) : '-');
  
  // Halfmove clock
  parts.push(position.halfmoveClock.toString());
  
  // Fullmove number
  parts.push(position.fullmoveNumber.toString());
  
  return parts.join(' ');
}

/** Convenience alias for FEN generation */
export function positionToFen(position: Position): string {
  return toFen(position);
}

/**
 * Generate the piece placement part of FEN
 */
function generatePiecePlacement(board: readonly (Piece | null)[]): string {
  const ranks: string[] = [];
  
  for (let rankIdx = 7; rankIdx >= 0; rankIdx--) {
    let rankStr = '';
    let emptyCount = 0;
    
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      const square = toSquareIndex(fileIdx, rankIdx);
      const piece = board[square];
      
      if (piece === null) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rankStr += emptyCount.toString();
          emptyCount = 0;
        }
        rankStr += PIECE_TO_CHAR[piece.color][piece.type];
      }
    }
    
    if (emptyCount > 0) {
      rankStr += emptyCount.toString();
    }
    
    ranks.push(rankStr);
  }
  
  return ranks.join('/');
}

/**
 * Generate castling rights string
 */
function generateCastlingRights(rights: CastlingRights): string {
  let result = '';
  if (rights.whiteKingside) result += 'K';
  if (rights.whiteQueenside) result += 'Q';
  if (rights.blackKingside) result += 'k';
  if (rights.blackQueenside) result += 'q';
  return result || '-';
}

/**
 * Validate a FEN string
 * @param fen FEN string to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateFen(fen: string): { isValid: boolean; error?: string } {
  try {
    const position = parseFen(fen);
    
    // Check that both kings exist
    let whiteKingCount = 0;
    let blackKingCount = 0;
    
    for (const piece of position.board) {
      if (piece?.type === PieceType.KING) {
        if (piece.color === ColorEnum.WHITE) whiteKingCount++;
        else blackKingCount++;
      }
    }
    
    if (whiteKingCount !== 1) {
      return { isValid: false, error: `Invalid position: expected 1 white king, found ${whiteKingCount}` };
    }
    if (blackKingCount !== 1) {
      return { isValid: false, error: `Invalid position: expected 1 black king, found ${blackKingCount}` };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/** Boolean helper for validation */
export function isValidFen(fen: string): boolean {
  return validateFen(fen).isValid;
}

/**
 * Parse FEN with fallback to starting position
 */
export function parseFenSafe(fen: string): Position {
  const validation = validateFen(fen);
  if (validation.isValid) {
    return parseFen(fen);
  }
  console.warn(`Invalid FEN "${fen}": ${validation.error ?? 'unknown'}. Using starting position.`);
  return createStartingPosition();
}
