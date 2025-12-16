/**
 * Chess Master Pro - Move Generation
 * 
 * This module handles generating pseudo-legal and legal moves for all piece types.
 * Move generation is the core of any chess engine and must be both correct and efficient.
 */

import type { 
  Position, 
  Move, 
  SquareIndex, 
  Piece, 
  Color, 
  Board,
  PromotionPiece 
} from '../../types';
import { PieceType, Color as ColorEnum, MoveType } from '../../types';
import {
  getFile,
  getRank,
  toSquareIndex,
  isValidFileRank,
  DIRECTION,
  KNIGHT_MOVES,
  KING_MOVES,
  ROOK_DIRECTIONS,
  BISHOP_DIRECTIONS,
  QUEEN_DIRECTIONS,
  CASTLING_EMPTY,
  CASTLING_PATH,
  KING_START,
  CASTLING_KING_DEST,
  ROOK_START,
  CASTLING_ROOK_DEST,
} from '../board/constants';
import { isEmpty, isEnemy, isFriendly, findKing, cloneBoard, getPiece } from '../board/utils';

// ============================================================================
// ATTACK DETECTION
// ============================================================================

/**
 * Check if a square is attacked by any piece of the given color
 */
export function isSquareAttacked(
  board: Board,
  square: SquareIndex,
  attackingColor: Color
): boolean {
  // Check pawn attacks
  if (isPawnAttacking(board, square, attackingColor)) return true;
  
  // Check knight attacks
  if (isKnightAttacking(board, square, attackingColor)) return true;
  
  // Check king attacks
  if (isKingAttacking(board, square, attackingColor)) return true;
  
  // Check sliding piece attacks (bishop, rook, queen)
  if (isSlidingPieceAttacking(board, square, attackingColor)) return true;
  
  return false;
}

/**
 * Check if a pawn of the given color attacks the square
 */
function isPawnAttacking(board: Board, square: SquareIndex, attackingColor: Color): boolean {
  const file = getFile(square);
  const rank = getRank(square);
  
  // Pawns attack diagonally forward
  const pawnRank = attackingColor === ColorEnum.WHITE ? rank - 1 : rank + 1;
  
  if (pawnRank < 0 || pawnRank > 7) return false;
  
  // Check left diagonal
  if (file > 0) {
    const leftSquare = toSquareIndex(file - 1, pawnRank);
    const piece = board[leftSquare];
    if (piece?.type === PieceType.PAWN && piece.color === attackingColor) {
      return true;
    }
  }
  
  // Check right diagonal
  if (file < 7) {
    const rightSquare = toSquareIndex(file + 1, pawnRank);
    const piece = board[rightSquare];
    if (piece?.type === PieceType.PAWN && piece.color === attackingColor) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a knight of the given color attacks the square
 */
function isKnightAttacking(board: Board, square: SquareIndex, attackingColor: Color): boolean {
  const file = getFile(square);
  const rank = getRank(square);
  
  for (const offset of KNIGHT_MOVES) {
    const targetSquare = square + offset;
    const targetFile = getFile(targetSquare);
    const targetRank = getRank(targetSquare);
    
    // Validate the knight move doesn't wrap around the board
    const fileDiff = Math.abs(targetFile - file);
    const rankDiff = Math.abs(targetRank - rank);
    
    if (!((fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1))) {
      continue;
    }
    
    if (targetSquare < 0 || targetSquare > 63) continue;
    
    const piece = board[targetSquare];
    if (piece?.type === PieceType.KNIGHT && piece.color === attackingColor) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a king of the given color attacks the square
 */
function isKingAttacking(board: Board, square: SquareIndex, attackingColor: Color): boolean {
  const file = getFile(square);
  const rank = getRank(square);
  
  for (const offset of KING_MOVES) {
    const targetSquare = square + offset;
    const targetFile = getFile(targetSquare);
    const targetRank = getRank(targetSquare);
    
    // Validate the king move is adjacent
    const fileDiff = Math.abs(targetFile - file);
    const rankDiff = Math.abs(targetRank - rank);
    
    if (fileDiff > 1 || rankDiff > 1) continue;
    if (targetSquare < 0 || targetSquare > 63) continue;
    
    const piece = board[targetSquare];
    if (piece?.type === PieceType.KING && piece.color === attackingColor) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a sliding piece (bishop, rook, queen) attacks the square
 */
function isSlidingPieceAttacking(
  board: Board,
  square: SquareIndex,
  attackingColor: Color
): boolean {
  const file = getFile(square);
  const rank = getRank(square);
  
  // Check rook/queen attacks (orthogonal)
  for (const direction of ROOK_DIRECTIONS) {
    let currentFile = file;
    let currentRank = rank;
    
    while (true) {
      if (direction === DIRECTION.NORTH) currentRank++;
      else if (direction === DIRECTION.SOUTH) currentRank--;
      else if (direction === DIRECTION.EAST) currentFile++;
      else if (direction === DIRECTION.WEST) currentFile--;
      
      if (!isValidFileRank(currentFile, currentRank)) break;
      
      const currentSquare = toSquareIndex(currentFile, currentRank);
      const piece = board[currentSquare];
      
      if (piece !== null) {
        if (piece.color === attackingColor &&
            (piece.type === PieceType.ROOK || piece.type === PieceType.QUEEN)) {
          return true;
        }
        break; // Blocked by a piece
      }
    }
  }
  
  // Check bishop/queen attacks (diagonal)
  for (const direction of BISHOP_DIRECTIONS) {
    let currentFile = file;
    let currentRank = rank;
    
    while (true) {
      if (direction === DIRECTION.NORTH_EAST) { currentRank++; currentFile++; }
      else if (direction === DIRECTION.NORTH_WEST) { currentRank++; currentFile--; }
      else if (direction === DIRECTION.SOUTH_EAST) { currentRank--; currentFile++; }
      else if (direction === DIRECTION.SOUTH_WEST) { currentRank--; currentFile--; }
      
      if (!isValidFileRank(currentFile, currentRank)) break;
      
      const currentSquare = toSquareIndex(currentFile, currentRank);
      const piece = board[currentSquare];
      
      if (piece !== null) {
        if (piece.color === attackingColor &&
            (piece.type === PieceType.BISHOP || piece.type === PieceType.QUEEN)) {
          return true;
        }
        break; // Blocked by a piece
      }
    }
  }
  
  return false;
}

/**
 * Check if the given color is in check
 */
export function isInCheck(board: Board, color: Color): boolean {
  const kingSquare = findKing(board, color);
  const enemyColor = color === ColorEnum.WHITE ? ColorEnum.BLACK : ColorEnum.WHITE;
  return isSquareAttacked(board, kingSquare, enemyColor);
}

// ============================================================================
// PSEUDO-LEGAL MOVE GENERATION
// ============================================================================

/**
 * Generate all pseudo-legal moves for a position
 * Pseudo-legal moves don't consider leaving the king in check
 */
export function generatePseudoLegalMoves(position: Position): Move[] {
  const moves: Move[] = [];
  const { board, sideToMove } = position;
  
  for (let square = 0; square < 64; square++) {
    const piece = board[square];
    if (piece === null || piece.color !== sideToMove) continue;
    
    switch (piece.type) {
      case PieceType.PAWN:
        generatePawnMoves(position, square, piece, moves);
        break;
      case PieceType.KNIGHT:
        generateKnightMoves(board, square, piece, moves);
        break;
      case PieceType.BISHOP:
        generateBishopMoves(board, square, piece, moves);
        break;
      case PieceType.ROOK:
        generateRookMoves(board, square, piece, moves);
        break;
      case PieceType.QUEEN:
        generateQueenMoves(board, square, piece, moves);
        break;
      case PieceType.KING:
        generateKingMoves(position, square, piece, moves);
        break;
    }
  }
  
  return moves;
}

/**
 * Generate pawn moves
 */
function generatePawnMoves(
  position: Position,
  from: SquareIndex,
  piece: Piece,
  moves: Move[]
): void {
  const { board, enPassantSquare } = position;
  const file = getFile(from);
  const rank = getRank(from);
  const isWhite = piece.color === ColorEnum.WHITE;
  const direction = isWhite ? 1 : -1;
  const startRank = isWhite ? 1 : 6;
  const promotionRank = isWhite ? 7 : 0;
  
  // Single push
  const singlePushRank = rank + direction;
  if (isValidFileRank(file, singlePushRank)) {
    const singlePushSquare = toSquareIndex(file, singlePushRank);
    
    if (isEmpty(board, singlePushSquare)) {
      if (singlePushRank === promotionRank) {
        // Promotion
        addPromotionMoves(from, singlePushSquare, piece, undefined, moves);
      } else {
        moves.push({
          from,
          to: singlePushSquare,
          piece,
          moveType: MoveType.NORMAL,
        });
        
        // Double push from starting position
        if (rank === startRank) {
          const doublePushRank = rank + 2 * direction;
          const doublePushSquare = toSquareIndex(file, doublePushRank);
          
          if (isEmpty(board, doublePushSquare)) {
            moves.push({
              from,
              to: doublePushSquare,
              piece,
              moveType: MoveType.NORMAL,
            });
          }
        }
      }
    }
  }
  
  // Captures (including en passant)
  for (const captureFile of [file - 1, file + 1]) {
    if (!isValidFileRank(captureFile, singlePushRank)) continue;
    
    const captureSquare = toSquareIndex(captureFile, singlePushRank);
    
    // Regular capture
    if (isEnemy(board, captureSquare, piece.color)) {
      const captured = getPiece(board, captureSquare);
      if (captured) {
        if (singlePushRank === promotionRank) {
          addPromotionMoves(from, captureSquare, piece, captured, moves);
        } else {
          moves.push({
            from,
            to: captureSquare,
            piece,
            moveType: MoveType.CAPTURE,
            captured,
          });
        }
      }
    }
    
    // En passant
    if (captureSquare === enPassantSquare) {
      const capturedPawnSquare = toSquareIndex(captureFile, rank);
      const capturedPawn = getPiece(board, capturedPawnSquare);
      if (capturedPawn) {
        moves.push({
          from,
          to: captureSquare,
          piece,
          moveType: MoveType.EN_PASSANT,
          captured: capturedPawn,
        });
      }
    }
  }
}

/**
 * Add all promotion moves for a pawn
 */
function addPromotionMoves(
  from: SquareIndex,
  to: SquareIndex,
  piece: Piece,
  captured: Piece | undefined,
  moves: Move[]
): void {
  const promotionPieces: PromotionPiece[] = ['q', 'r', 'b', 'n'];
  const moveType = captured ? MoveType.PROMOTION_CAPTURE : MoveType.PROMOTION;
  
  for (const promotion of promotionPieces) {
    moves.push({
      from,
      to,
      piece,
      moveType,
      captured,
      promotion,
    });
  }
}

/**
 * Generate knight moves
 */
function generateKnightMoves(
  board: Board,
  from: SquareIndex,
  piece: Piece,
  moves: Move[]
): void {
  const file = getFile(from);
  const rank = getRank(from);
  
  for (const offset of KNIGHT_MOVES) {
    const to = from + offset;
    const toFile = getFile(to);
    const toRank = getRank(to);
    
    // Validate the knight move
    const fileDiff = Math.abs(toFile - file);
    const rankDiff = Math.abs(toRank - rank);
    
    if (!((fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1))) {
      continue;
    }
    
    if (to < 0 || to > 63) continue;
    if (isFriendly(board, to, piece.color)) continue;
    
    const captured = getPiece(board, to);
    moves.push({
      from,
      to,
      piece,
      moveType: captured ? MoveType.CAPTURE : MoveType.NORMAL,
      captured: captured ?? undefined,
    });
  }
}

/**
 * Generate sliding piece moves in given directions
 */
function generateSlidingMoves(
  board: Board,
  from: SquareIndex,
  piece: Piece,
  directions: readonly number[],
  moves: Move[]
): void {
  const file = getFile(from);
  const rank = getRank(from);
  
  for (const direction of directions) {
    let currentFile = file;
    let currentRank = rank;
    
    while (true) {
      // Update position based on direction
      if (direction === DIRECTION.NORTH) currentRank++;
      else if (direction === DIRECTION.SOUTH) currentRank--;
      else if (direction === DIRECTION.EAST) currentFile++;
      else if (direction === DIRECTION.WEST) currentFile--;
      else if (direction === DIRECTION.NORTH_EAST) { currentRank++; currentFile++; }
      else if (direction === DIRECTION.NORTH_WEST) { currentRank++; currentFile--; }
      else if (direction === DIRECTION.SOUTH_EAST) { currentRank--; currentFile++; }
      else if (direction === DIRECTION.SOUTH_WEST) { currentRank--; currentFile--; }
      
      if (!isValidFileRank(currentFile, currentRank)) break;
      
      const to = toSquareIndex(currentFile, currentRank);
      
      if (isFriendly(board, to, piece.color)) break;
      
      const captured = getPiece(board, to);
      moves.push({
        from,
        to,
        piece,
        moveType: captured ? MoveType.CAPTURE : MoveType.NORMAL,
        captured: captured ?? undefined,
      });
      
      if (captured) break; // Can't move past a capture
    }
  }
}

function generateBishopMoves(board: Board, from: SquareIndex, piece: Piece, moves: Move[]): void {
  generateSlidingMoves(board, from, piece, BISHOP_DIRECTIONS, moves);
}

function generateRookMoves(board: Board, from: SquareIndex, piece: Piece, moves: Move[]): void {
  generateSlidingMoves(board, from, piece, ROOK_DIRECTIONS, moves);
}

function generateQueenMoves(board: Board, from: SquareIndex, piece: Piece, moves: Move[]): void {
  generateSlidingMoves(board, from, piece, QUEEN_DIRECTIONS, moves);
}

/**
 * Generate king moves including castling
 */
function generateKingMoves(
  position: Position,
  from: SquareIndex,
  piece: Piece,
  moves: Move[]
): void {
  const { board, castlingRights, sideToMove } = position;
  const file = getFile(from);
  const rank = getRank(from);
  
  // Normal king moves
  for (const offset of KING_MOVES) {
    const to = from + offset;
    const toFile = getFile(to);
    const toRank = getRank(to);
    
    // Validate adjacent move
    const fileDiff = Math.abs(toFile - file);
    const rankDiff = Math.abs(toRank - rank);
    
    if (fileDiff > 1 || rankDiff > 1) continue;
    if (to < 0 || to > 63) continue;
    if (isFriendly(board, to, piece.color)) continue;
    
    const captured = getPiece(board, to);
    moves.push({
      from,
      to,
      piece,
      moveType: captured ? MoveType.CAPTURE : MoveType.NORMAL,
      captured: captured ?? undefined,
    });
  }
  
  // Castling
  const isWhite = sideToMove === ColorEnum.WHITE;
  const enemyColor = isWhite ? ColorEnum.BLACK : ColorEnum.WHITE;
  const kingStart = isWhite ? KING_START.WHITE : KING_START.BLACK;
  
  // Can only castle if king is on starting square and not in check
  if (from !== kingStart) return;
  if (isSquareAttacked(board, from, enemyColor)) return;
  
  // Kingside castling
  const canKingside = isWhite ? castlingRights.whiteKingside : castlingRights.blackKingside;
  if (canKingside) {
    const emptySquares = isWhite ? CASTLING_EMPTY.WHITE_KINGSIDE : CASTLING_EMPTY.BLACK_KINGSIDE;
    const pathSquares = isWhite ? CASTLING_PATH.WHITE_KINGSIDE : CASTLING_PATH.BLACK_KINGSIDE;
    const kingDest = isWhite ? CASTLING_KING_DEST.WHITE_KINGSIDE : CASTLING_KING_DEST.BLACK_KINGSIDE;
    
    const allEmpty = emptySquares.every(sq => isEmpty(board, sq));
    const pathSafe = pathSquares.every(sq => !isSquareAttacked(board, sq, enemyColor));
    
    if (allEmpty && pathSafe) {
      moves.push({
        from,
        to: kingDest,
        piece,
        moveType: MoveType.CASTLING_KINGSIDE,
      });
    }
  }
  
  // Queenside castling
  const canQueenside = isWhite ? castlingRights.whiteQueenside : castlingRights.blackQueenside;
  if (canQueenside) {
    const emptySquares = isWhite ? CASTLING_EMPTY.WHITE_QUEENSIDE : CASTLING_EMPTY.BLACK_QUEENSIDE;
    const pathSquares = isWhite ? CASTLING_PATH.WHITE_QUEENSIDE : CASTLING_PATH.BLACK_QUEENSIDE;
    const kingDest = isWhite ? CASTLING_KING_DEST.WHITE_QUEENSIDE : CASTLING_KING_DEST.BLACK_QUEENSIDE;
    
    const allEmpty = emptySquares.every(sq => isEmpty(board, sq));
    const pathSafe = pathSquares.every(sq => !isSquareAttacked(board, sq, enemyColor));
    
    if (allEmpty && pathSafe) {
      moves.push({
        from,
        to: kingDest,
        piece,
        moveType: MoveType.CASTLING_QUEENSIDE,
      });
    }
  }
}

// ============================================================================
// LEGAL MOVE GENERATION
// ============================================================================

/**
 * Make a move on the board and return the new board state
 * This is used for testing legality (leaves king in check?)
 */
export function makeMove(position: Position, move: Move): Position {
  const board = cloneBoard(position.board);
  const { from, to, moveType, promotion } = move;
  
  // Remove piece from source square
  const piece = board[from];
  board[from] = null;
  
  // Handle special moves
  switch (moveType) {
    case MoveType.EN_PASSANT: {
      // Remove the captured pawn
      const capturedPawnRank = getRank(from);
      const capturedPawnFile = getFile(to);
      const capturedPawnSquare = toSquareIndex(capturedPawnFile, capturedPawnRank);
      board[capturedPawnSquare] = null;
      board[to] = piece;
      break;
    }
    
    case MoveType.CASTLING_KINGSIDE: {
      board[to] = piece;
      const isWhite = piece?.color === ColorEnum.WHITE;
      const rookFrom = isWhite ? ROOK_START.WHITE_KINGSIDE : ROOK_START.BLACK_KINGSIDE;
      const rookTo = isWhite ? CASTLING_ROOK_DEST.WHITE_KINGSIDE : CASTLING_ROOK_DEST.BLACK_KINGSIDE;
      board[rookTo] = board[rookFrom];
      board[rookFrom] = null;
      break;
    }
    
    case MoveType.CASTLING_QUEENSIDE: {
      board[to] = piece;
      const isWhite = piece?.color === ColorEnum.WHITE;
      const rookFrom = isWhite ? ROOK_START.WHITE_QUEENSIDE : ROOK_START.BLACK_QUEENSIDE;
      const rookTo = isWhite ? CASTLING_ROOK_DEST.WHITE_QUEENSIDE : CASTLING_ROOK_DEST.BLACK_QUEENSIDE;
      board[rookTo] = board[rookFrom];
      board[rookFrom] = null;
      break;
    }
    
    case MoveType.PROMOTION:
    case MoveType.PROMOTION_CAPTURE: {
      // Replace pawn with promoted piece
      if (piece && promotion) {
        board[to] = { type: promotion, color: piece.color };
      }
      break;
    }
    
    default:
      board[to] = piece;
  }
  
  // Update en passant square
  let enPassantSquare: SquareIndex | null = null;
  if (piece?.type === PieceType.PAWN) {
    const rankDiff = Math.abs(getRank(to) - getRank(from));
    if (rankDiff === 2) {
      // Pawn moved two squares, set en passant square
      const epRank = (getRank(from) + getRank(to)) / 2;
      enPassantSquare = toSquareIndex(getFile(from), epRank);
    }
  }
  
  // Update castling rights
  const castlingRights = position.castlingRights;
  const newCastlingRights = {
    whiteKingside: castlingRights.whiteKingside,
    whiteQueenside: castlingRights.whiteQueenside,
    blackKingside: castlingRights.blackKingside,
    blackQueenside: castlingRights.blackQueenside,
  };
  
  // King moves
  if (piece?.type === PieceType.KING) {
    if (piece.color === ColorEnum.WHITE) {
      newCastlingRights.whiteKingside = false;
      newCastlingRights.whiteQueenside = false;
    } else {
      newCastlingRights.blackKingside = false;
      newCastlingRights.blackQueenside = false;
    }
  }
  
  // Rook moves or captures
  if (from === ROOK_START.WHITE_KINGSIDE || to === ROOK_START.WHITE_KINGSIDE) {
    newCastlingRights.whiteKingside = false;
  }
  if (from === ROOK_START.WHITE_QUEENSIDE || to === ROOK_START.WHITE_QUEENSIDE) {
    newCastlingRights.whiteQueenside = false;
  }
  if (from === ROOK_START.BLACK_KINGSIDE || to === ROOK_START.BLACK_KINGSIDE) {
    newCastlingRights.blackKingside = false;
  }
  if (from === ROOK_START.BLACK_QUEENSIDE || to === ROOK_START.BLACK_QUEENSIDE) {
    newCastlingRights.blackQueenside = false;
  }
  
  // Update halfmove clock
  let halfmoveClock = position.halfmoveClock + 1;
  if (piece?.type === PieceType.PAWN || move.captured) {
    halfmoveClock = 0;
  }
  
  // Update fullmove number
  let fullmoveNumber = position.fullmoveNumber;
  if (position.sideToMove === ColorEnum.BLACK) {
    fullmoveNumber++;
  }
  
  return {
    board,
    sideToMove: position.sideToMove === ColorEnum.WHITE ? ColorEnum.BLACK : ColorEnum.WHITE,
    castlingRights: newCastlingRights,
    enPassantSquare,
    halfmoveClock,
    fullmoveNumber,
  };
}

/**
 * Check if a move is legal (doesn't leave king in check)
 */
export function isMoveLegal(position: Position, move: Move): boolean {
  const newPosition = makeMove(position, move);
  // Check if the moving side's king is in check after the move
  return !isInCheck(newPosition.board, position.sideToMove);
}

/**
 * Generate all legal moves for a position
 */
export function generateLegalMoves(position: Position): Move[] {
  const pseudoLegalMoves = generatePseudoLegalMoves(position);
  return pseudoLegalMoves.filter(move => isMoveLegal(position, move));
}

/**
 * Get legal moves for a specific square
 */
export function getLegalMovesFromSquare(position: Position, square: SquareIndex): Move[] {
  const allMoves = generateLegalMoves(position);
  return allMoves.filter(move => move.from === square);
}
