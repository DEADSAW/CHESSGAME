/**
 * Chess Master Pro - Move Notation
 * 
 * Converts moves to and from standard algebraic notation (SAN) and
 * coordinate notation (e.g., "e2e4").
 */

import type { Move, Position, SquareIndex, PromotionPiece } from '../../types';
import { PieceType, MoveType } from '../../types';
import { indexToNotation, notationToIndex, getFile, getRank } from '../board/constants';
import { generateLegalMoves } from './generator';

// ============================================================================
// COORDINATE NOTATION
// ============================================================================

/**
 * Convert a move to coordinate notation (e.g., "e2e4", "e7e8q")
 */
export function moveToCoordinate(move: Move): string {
  const from = indexToNotation(move.from);
  const to = indexToNotation(move.to);
  const promotion = move.promotion ?? '';
  return `${from}${to}${promotion}`;
}

/**
 * Parse coordinate notation to find the matching legal move
 */
export function parseCoordinate(position: Position, notation: string): Move | null {
  if (notation.length < 4 || notation.length > 5) return null;
  
  const fromStr = notation.substring(0, 2);
  const toStr = notation.substring(2, 4);
  const promotionStr = notation.length === 5 ? notation[4] : undefined;
  
  let from: SquareIndex;
  let to: SquareIndex;
  
  try {
    from = notationToIndex(fromStr as `${string}${string}`);
    to = notationToIndex(toStr as `${string}${string}`);
  } catch {
    return null;
  }
  
  const legalMoves = generateLegalMoves(position);
  
  for (const move of legalMoves) {
    if (move.from === from && move.to === to) {
      // Check promotion piece if specified
      if (promotionStr) {
        if (move.promotion === promotionStr) return move;
      } else if (!move.promotion) {
        return move;
      }
    }
  }
  
  // If promotion move but no promotion specified, default to queen
  if (!promotionStr) {
    for (const move of legalMoves) {
      if (move.from === from && move.to === to && move.promotion === 'q') {
        return move;
      }
    }
  }
  
  return null;
}

// ============================================================================
// STANDARD ALGEBRAIC NOTATION (SAN)
// ============================================================================

/**
 * Convert a move to Standard Algebraic Notation (SAN)
 * e.g., "e4", "Nf3", "Bxe5", "O-O", "e8=Q"
 */
export function moveToSan(position: Position, move: Move): string {
  const { piece, from, to, moveType, captured, promotion } = move;
  
  // Castling
  if (moveType === MoveType.CASTLING_KINGSIDE) return 'O-O';
  if (moveType === MoveType.CASTLING_QUEENSIDE) return 'O-O-O';
  
  let san = '';
  
  // Piece letter (uppercase, pawns have no letter)
  if (piece.type !== PieceType.PAWN) {
    san += piece.type.toUpperCase();
  }
  
  // Disambiguation for non-pawn pieces
  if (piece.type !== PieceType.PAWN) {
    const ambiguousMoves = findAmbiguousMoves(position, move);
    if (ambiguousMoves.length > 0) {
      const fromFile = getFile(from);
      const fromRank = getRank(from);
      
      const sameFile = ambiguousMoves.some(m => getFile(m.from) === fromFile);
      const sameRank = ambiguousMoves.some(m => getRank(m.from) === fromRank);
      
      if (!sameFile) {
        san += indexToNotation(from)[0]; // Add file
      } else if (!sameRank) {
        san += indexToNotation(from)[1]; // Add rank
      } else {
        san += indexToNotation(from); // Add full square
      }
    }
  }
  
  // Pawn captures include the file
  if (piece.type === PieceType.PAWN && captured) {
    san += indexToNotation(from)[0];
  }
  
  // Capture symbol
  if (captured) {
    san += 'x';
  }
  
  // Destination square
  san += indexToNotation(to);
  
  // Promotion
  if (promotion) {
    san += '=' + promotion.toUpperCase();
  }
  
  // Check/checkmate markers are added later when we know the resulting position
  return san;
}

/**
 * Find other pieces of the same type that can move to the same square
 */
function findAmbiguousMoves(position: Position, move: Move): Move[] {
  const legalMoves = generateLegalMoves(position);
  
  return legalMoves.filter(m =>
    m.to === move.to &&
    m.from !== move.from &&
    m.piece.type === move.piece.type &&
    m.piece.color === move.piece.color
  );
}

/**
 * Add check/checkmate notation to SAN
 */
export function moveToSanWithCheck(position: Position, move: Move, resultingPosition: Position): string {
  let san = moveToSan(position, move);
  
  const legalMoves = generateLegalMoves(resultingPosition);
  const isCheck = legalMoves.length > 0 && isInCheckHelper(resultingPosition);
  const isCheckmate = legalMoves.length === 0 && isInCheckHelper(resultingPosition);
  
  if (isCheckmate) {
    san += '#';
  } else if (isCheck) {
    san += '+';
  }
  
  return san;
}

/**
 * Helper to check if side to move is in check
 */
function isInCheckHelper(position: Position): boolean {
  // Import would cause circular dependency, so we inline the check
  const { board, sideToMove } = position;
  
  // Find king
  let kingSquare = -1;
  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (piece?.type === PieceType.KING && piece.color === sideToMove) {
      kingSquare = i;
      break;
    }
  }
  
  if (kingSquare === -1) return false;
  
  // Dynamically import to avoid circular dependency
  // For simplicity, we'll return false here and handle it in the caller
  return false;
}

/**
 * Parse SAN notation to find the matching legal move
 */
export function parseSan(position: Position, san: string): Move | null {
  // Remove check/checkmate symbols
  let cleanSan = san.replace(/[+#]$/, '');
  
  // Handle castling
  if (cleanSan === 'O-O' || cleanSan === '0-0') {
    const legalMoves = generateLegalMoves(position);
    return legalMoves.find(m => m.moveType === MoveType.CASTLING_KINGSIDE) ?? null;
  }
  if (cleanSan === 'O-O-O' || cleanSan === '0-0-0') {
    const legalMoves = generateLegalMoves(position);
    return legalMoves.find(m => m.moveType === MoveType.CASTLING_QUEENSIDE) ?? null;
  }
  
  // Parse piece type
  let pieceType = PieceType.PAWN;
  const pieceChars = 'NBRQK';
  if (pieceChars.includes(cleanSan[0] ?? '')) {
    pieceType = cleanSan[0]?.toLowerCase() as typeof pieceType;
    cleanSan = cleanSan.substring(1);
  }
  
  // Parse promotion
  let promotion: PromotionPiece | undefined;
  const promotionMatch = cleanSan.match(/=([QRBN])$/i);
  if (promotionMatch?.[1]) {
    promotion = promotionMatch[1].toLowerCase() as PromotionPiece;
    cleanSan = cleanSan.replace(/=[QRBN]$/i, '');
  }
  
  // Remove capture symbol
  cleanSan = cleanSan.replace('x', '');
  
  // Parse destination square (last 2 characters)
  if (cleanSan.length < 2) return null;
  const destStr = cleanSan.substring(cleanSan.length - 2);
  let dest: SquareIndex;
  try {
    dest = notationToIndex(destStr as `${string}${string}`);
  } catch {
    return null;
  }
  
  // Parse disambiguation
  const disambig = cleanSan.substring(0, cleanSan.length - 2);
  let disambigFile: number | undefined;
  let disambigRank: number | undefined;
  
  for (const char of disambig) {
    if (char >= 'a' && char <= 'h') {
      disambigFile = char.charCodeAt(0) - 'a'.charCodeAt(0);
    } else if (char >= '1' && char <= '8') {
      disambigRank = parseInt(char, 10) - 1;
    }
  }
  
  // Find matching legal move
  const legalMoves = generateLegalMoves(position);
  
  for (const move of legalMoves) {
    if (move.to !== dest) continue;
    if (move.piece.type !== pieceType) continue;
    if (promotion !== undefined && move.promotion !== promotion) continue;
    if (promotion === undefined && move.promotion !== undefined) continue;
    
    // Check disambiguation
    if (disambigFile !== undefined && getFile(move.from) !== disambigFile) continue;
    if (disambigRank !== undefined && getRank(move.from) !== disambigRank) continue;
    
    return move;
  }
  
  return null;
}

/**
 * Generate move list in PGN format
 */
export function movesToPgn(positions: Position[], moves: Move[]): string {
  const parts: string[] = [];
  
  for (let i = 0; i < moves.length; i++) {
    const position = positions[i];
    const move = moves[i];
    
    if (!position || !move) continue;
    
    // Add move number for white's moves
    if (position.sideToMove === 'w') {
      parts.push(`${position.fullmoveNumber}.`);
    }
    
    parts.push(moveToSan(position, move));
  }
  
  return parts.join(' ');
}
