/**
 * Chess Master Pro - Engine Main Export
 * 
 * This is the main entry point for the chess engine.
 * It exports all public APIs for use by the UI and worker.
 */

// Board utilities
export {
  // Constants
  BOARD_SIZE,
  NUM_SQUARES,
  FILES,
  RANKS,
  toSquareIndex,
  getFile,
  getRank,
  notationToIndex,
  indexToNotation,
  isValidSquare,
  getSquareColor,
  KING_START,
  ROOK_START,
} from './board/constants';

export {
  createEmptyBoard,
  createStartingBoard,
  createStartingPosition,
  cloneBoard,
  clonePosition,
  getPiece,
  setPiece,
  isEmpty,
  isEnemy,
  isFriendly,
  findPieces,
  findKing,
  getPiecesForColor,
  oppositeColor,
} from './board/utils';

export {
  STARTING_FEN,
  parseFen,
  toFen,
  validateFen,
  parseFenSafe,
} from './board/fen';

// Move generation
export {
  generateLegalMoves,
  generatePseudoLegalMoves,
  getLegalMovesFromSquare,
  makeMove,
  isMoveLegal,
  isInCheck,
  isSquareAttacked,
} from './moves/generator';

export {
  moveToCoordinate,
  parseCoordinate,
  moveToSan,
  parseSan,
  movesToPgn,
} from './moves/notation';

// Evaluation
export {
  evaluate,
  getEvaluationBreakdown,
  evaluateMaterial,
  PIECE_VALUES,
  MATE_SCORE,
  DRAW_SCORE,
} from './evaluation/evaluate';

// Search
export {
  search,
  findBestMove,
} from './search/search';

export {
  computeHash,
} from './search/zobrist';

export {
  transpositionTable,
} from './search/transposition';

// AI
export {
  calculateAiMove,
  getDifficultyConfig,
  getDifficultyDescription,
} from './ai/difficulty';

// Types and constants re-export for convenience
export {
  PieceType,
  Color,
  MoveType,
  GameResult,
  DifficultyLevel,
  PlayStyle,
} from '../types';

export type {
  Position,
  Move,
  Piece,
  Board,
  SquareIndex,
  CastlingRights,
  GameState,
  SearchOptions,
  SearchResult,
  EvaluationBreakdown,
} from '../types';
