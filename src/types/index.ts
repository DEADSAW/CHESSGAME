/**
 * Chess Master Pro - Core Type Definitions
 * 
 * This file contains all the fundamental types used throughout the chess engine
 * and game logic. These types are designed to be strict, self-documenting, and
 * provide excellent TypeScript inference.
 */

// ============================================================================
// PIECE TYPES
// ============================================================================

/** Piece type identifiers using standard chess notation */
export const PieceType = {
  PAWN: 'p',
  KNIGHT: 'n',
  BISHOP: 'b',
  ROOK: 'r',
  QUEEN: 'q',
  KING: 'k',
} as const;

export type PieceType = (typeof PieceType)[keyof typeof PieceType];

/** Player colors */
export const Color = {
  WHITE: 'w',
  BLACK: 'b',
} as const;

export type Color = (typeof Color)[keyof typeof Color];

/** A piece on the board, combining type and color */
export interface Piece {
  readonly type: PieceType;
  readonly color: Color;
}

// ============================================================================
// BOARD REPRESENTATION
// ============================================================================

/** File (column) identifiers a-h */
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';

/** Rank (row) identifiers 1-8 */
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

/** Standard algebraic notation for a square (e.g., "e4") */
export type SquareNotation = `${File}${Rank}`;

/** 
 * Square index for internal board representation (0-63)
 * Maps to a1=0, b1=1, ..., h8=63 (rank-major ordering)
 */
export type SquareIndex = number;

/** A board square content - can either contain a piece or be empty (null) */
export type BoardSquare = Piece | null;

/** A square position notation (like "e4") - used for UI */
export type Square = SquareNotation | null;

/** 
 * Board representation as a flat array of 64 squares
 * Index mapping: index = rank * 8 + file (where a=0, b=1, etc.)
 */
export type Board = readonly BoardSquare[];

/** Mutable board for internal operations */
export type MutableBoard = BoardSquare[];

// ============================================================================
// CASTLING RIGHTS
// ============================================================================

/** Castling availability for both sides */
export interface CastlingRights {
  readonly whiteKingside: boolean;
  readonly whiteQueenside: boolean;
  readonly blackKingside: boolean;
  readonly blackQueenside: boolean;
}

// ============================================================================
// GAME POSITION
// ============================================================================

/** 
 * Complete game position state
 * Contains all information needed to generate legal moves
 */
export interface Position {
  readonly board: Board;
  readonly sideToMove: Color;
  readonly castlingRights: CastlingRights;
  /** En passant target square (null if not available) */
  readonly enPassantSquare: SquareIndex | null;
  /** Halfmove clock for 50-move rule */
  readonly halfmoveClock: number;
  /** Fullmove number (starts at 1, incremented after Black's move) */
  readonly fullmoveNumber: number;
}

/** Mutable position for internal operations */
export interface MutablePosition {
  board: MutableBoard;
  sideToMove: Color;
  castlingRights: CastlingRights;
  enPassantSquare: SquareIndex | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

// ============================================================================
// MOVES
// ============================================================================

/** Special move types */
export const MoveType = {
  NORMAL: 'normal',
  CAPTURE: 'capture',
  EN_PASSANT: 'enPassant',
  CASTLING_KINGSIDE: 'castlingKingside',
  CASTLING_QUEENSIDE: 'castlingQueenside',
  PROMOTION: 'promotion',
  PROMOTION_CAPTURE: 'promotionCapture',
} as const;

export type MoveType = (typeof MoveType)[keyof typeof MoveType];

/** Pieces available for pawn promotion */
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

/** 
 * Complete move representation
 * Contains all information needed to make and unmake the move
 */
export interface Move {
  readonly from: SquareIndex;
  readonly to: SquareIndex;
  readonly piece: Piece;
  readonly moveType: MoveType;
  /** Captured piece (for captures and en passant) */
  readonly captured?: Piece;
  /** Promotion piece type (for promotions) */
  readonly promotion?: PromotionPiece;
}

/** Move in standard algebraic notation */
export type MoveNotation = string;

// ============================================================================
// GAME STATE
// ============================================================================

/** Possible game outcomes */
export const GameResult = {
  ONGOING: 'ongoing',
  WHITE_WINS_CHECKMATE: 'whiteWinsCheckmate',
  BLACK_WINS_CHECKMATE: 'blackWinsCheckmate',
  DRAW_STALEMATE: 'drawStalemate',
  DRAW_INSUFFICIENT_MATERIAL: 'drawInsufficientMaterial',
  DRAW_FIFTY_MOVES: 'drawFiftyMoves',
  DRAW_THREEFOLD_REPETITION: 'drawThreefoldRepetition',
  DRAW_AGREEMENT: 'drawAgreement',
  WHITE_RESIGNS: 'whiteResigns',
  BLACK_RESIGNS: 'blackResigns',
} as const;

export type GameResult = (typeof GameResult)[keyof typeof GameResult];

/** Game state flags */
export interface GameState {
  readonly position: Position;
  readonly isCheck: boolean;
  readonly isCheckmate: boolean;
  readonly isStalemate: boolean;
  readonly isDraw: boolean;
  readonly result: GameResult;
  readonly legalMoves: readonly Move[];
}

// ============================================================================
// ENGINE SEARCH
// ============================================================================

/** AI difficulty levels */
export const DifficultyLevel = {
  BEGINNER: 'beginner',
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert',
} as const;

export type DifficultyLevel = (typeof DifficultyLevel)[keyof typeof DifficultyLevel];

/** @deprecated Use DifficultyLevel instead */
export const Difficulty = DifficultyLevel;
/** @deprecated Use DifficultyLevel instead */
export type Difficulty = DifficultyLevel;

/** AI playing style bias */
export const PlayStyle = {
  AGGRESSIVE: 'aggressive',
  DEFENSIVE: 'defensive',
  BALANCED: 'balanced',
} as const;

export type PlayStyle = (typeof PlayStyle)[keyof typeof PlayStyle];

/** Search configuration options */
export interface SearchOptions {
  /** Maximum search depth */
  readonly maxDepth: number;
  /** Maximum search time in milliseconds */
  readonly maxTimeMs: number;
  /** Difficulty level */
  readonly difficulty: Difficulty;
  /** Playing style bias */
  readonly playStyle: PlayStyle;
  /** Mistake probability (0-1) for human-like play */
  readonly mistakeProbability: number;
}

/** Principal variation - best line of play */
export type PrincipalVariation = readonly Move[];

/** Evaluation component breakdown */
export interface EvaluationBreakdown {
  readonly material: number;
  readonly mobility: number;
  readonly kingSafety: number;
  readonly centerControl: number;
  readonly pawnStructure: number;
  readonly pieceActivity: number;
}

/** Search result returned by the engine */
export interface SearchResult {
  readonly bestMove: Move;
  readonly evaluation: number;
  readonly score: number;  // Alias for evaluation
  readonly evaluationBreakdown: EvaluationBreakdown;
  readonly principalVariation: PrincipalVariation;
  readonly pv: readonly Move[];  // Alias for principalVariation
  readonly depth: number;
  readonly nodesSearched: number;
  readonly nodes: number;  // Alias for nodesSearched
  readonly timeMs: number;
  /** Human-readable explanation of the move */
  readonly explanation: string[];
}

// ============================================================================
// ZOBRIST HASHING
// ============================================================================

/** Zobrist hash for transposition table */
export type ZobristHash = bigint;

/** Transposition table entry */
export interface TranspositionEntry {
  readonly hash: ZobristHash;
  readonly depth: number;
  readonly evaluation: number;
  readonly nodeType: 'exact' | 'lowerBound' | 'upperBound';
  readonly bestMove: Move | null;
}

// ============================================================================
// WORKER MESSAGES
// ============================================================================

/** Message types for worker communication */
export const WorkerMessageType = {
  INIT: 'init',
  SET_POSITION: 'setPosition',
  SEARCH: 'search',
  STOP: 'stop',
  RESULT: 'result',
  PROGRESS: 'progress',
  ERROR: 'error',
  DEBUG: 'debug',
} as const;

export type WorkerMessageType = (typeof WorkerMessageType)[keyof typeof WorkerMessageType];

/** Messages sent to the worker */
export type WorkerInMessage =
  | { type: 'init' }
  | { type: 'setPosition'; fen: string }
  | { type: 'search'; options: SearchOptions }
  | { type: 'stop' }
  | { type: 'debug'; command: string };

/** Messages received from the worker */
export type WorkerOutMessage =
  | { type: 'init'; success: boolean }
  | { type: 'result'; result: SearchResult }
  | { type: 'progress'; depth: number; nodes: number; evaluation: number }
  | { type: 'error'; message: string }
  | { type: 'debug'; data: unknown };

// ============================================================================
// UI TYPES
// ============================================================================

/** Game mode */
export const GameMode = {
  PASS_AND_PLAY: 'passAndPlay',
  VS_COMPUTER: 'vsComputer',
} as const;

export type GameMode = (typeof GameMode)[keyof typeof GameMode];

/** UI theme */
export const Theme = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type Theme = (typeof Theme)[keyof typeof Theme];

/** Board orientation */
export const BoardOrientation = {
  WHITE: 'white',
  BLACK: 'black',
} as const;

export type BoardOrientation = (typeof BoardOrientation)[keyof typeof BoardOrientation];

/** UI settings */
export interface UISettings {
  readonly theme: Theme;
  readonly boardOrientation: BoardOrientation;
  readonly showLegalMoves: boolean;
  readonly showLastMove: boolean;
  readonly showCoordinates: boolean;
  readonly animationSpeed: number;
  readonly soundEnabled: boolean;
}

/** History entry for undo/redo */
export interface HistoryEntry {
  readonly position: Position;
  readonly move: Move | null;
  readonly notation: string;
}

/** Complete game history */
export interface GameHistory {
  readonly entries: readonly HistoryEntry[];
  readonly currentIndex: number;
}
