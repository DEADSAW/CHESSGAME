/**
 * Chess Master Pro - Game Controller
 * 
 * Central game state management with support for:
 * - Pass & play mode
 * - Player vs Computer mode
 * - Undo/redo
 * - Game history
 */

import type { 
  Position, 
  Move, 
  GameMode, 
  GameResult, 
  GameState,
  Difficulty,
  PlayStyle,
  HistoryEntry,
  SearchResult,
  Color,
} from '../types';
import { 
  GameMode as GameModeEnum, 
  GameResult as GameResultEnum,
  Color as ColorEnum,
  Difficulty as DifficultyEnum,
  PlayStyle as PlayStyleEnum,
} from '../types';
import { 
  createStartingPosition, 
  parseFenSafe,
  toFen,
  generateLegalMoves, 
  makeMove, 
  isInCheck,
  moveToSan,
  findKing,
  isSquareAttacked,
  getPiecesForColor,
  PieceType,
} from '../engine';
import { getEngineWorker } from '../worker';

// ============================================================================
// GAME STATE TYPE
// ============================================================================

export interface GameControllerState {
  // Core game state
  position: Position;
  gameMode: GameMode;
  gameResult: GameResult;
  
  // History for undo/redo
  history: HistoryEntry[];
  currentHistoryIndex: number;
  
  // AI settings
  difficulty: Difficulty;
  playStyle: PlayStyle;
  playerColor: Color; // Player's color when vs AI
  
  // UI state
  isThinking: boolean;
  lastSearchResult: SearchResult | null;
  selectedSquare: number | null;
  legalMovesForSelected: Move[];
  lastMove: Move | null;
  
  // Game flags
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export function createInitialState(): GameControllerState {
  const position = createStartingPosition();
  const legalMoves = generateLegalMoves(position);
  
  return {
    position,
    gameMode: GameModeEnum.PASS_AND_PLAY,
    gameResult: GameResultEnum.ONGOING,
    
    history: [{
      position,
      move: null,
      notation: 'Starting position',
    }],
    currentHistoryIndex: 0,
    
    difficulty: DifficultyEnum.MEDIUM,
    playStyle: PlayStyleEnum.BALANCED,
    playerColor: ColorEnum.WHITE,
    
    isThinking: false,
    lastSearchResult: null,
    selectedSquare: null,
    legalMovesForSelected: [],
    lastMove: null,
    
    isCheck: false,
    isCheckmate: legalMoves.length === 0 && isInCheck(position.board, position.sideToMove),
    isStalemate: legalMoves.length === 0 && !isInCheck(position.board, position.sideToMove),
    isDraw: false,
  };
}

// ============================================================================
// GAME CONTROLLER CLASS
// ============================================================================

export type GameStateListener = (state: GameControllerState) => void;

export class GameController {
  private state: GameControllerState;
  private listeners: Set<GameStateListener>;
  
  constructor() {
    this.state = createInitialState();
    this.listeners = new Set();
  }
  
  // ========================================================================
  // STATE ACCESS
  // ========================================================================
  
  getState(): GameControllerState {
    return this.state;
  }
  
  subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
  
  private setState(updates: Partial<GameControllerState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }
  
  // ========================================================================
  // GAME SETUP
  // ========================================================================
  
  /**
   * Start a new game
   */
  newGame(mode: GameMode, options?: {
    difficulty?: Difficulty;
    playStyle?: PlayStyle;
    playerColor?: Color;
    fen?: string;
  }): void {
    const position = options?.fen 
      ? parseFenSafe(options.fen) 
      : createStartingPosition();
    
    const legalMoves = generateLegalMoves(position);
    const isCheck = isInCheck(position.board, position.sideToMove);
    
    this.state = {
      position,
      gameMode: mode,
      gameResult: GameResultEnum.ONGOING,
      
      history: [{
        position,
        move: null,
        notation: 'Starting position',
      }],
      currentHistoryIndex: 0,
      
      difficulty: options?.difficulty ?? DifficultyEnum.MEDIUM,
      playStyle: options?.playStyle ?? PlayStyleEnum.BALANCED,
      playerColor: options?.playerColor ?? ColorEnum.WHITE,
      
      isThinking: false,
      lastSearchResult: null,
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove: null,
      
      isCheck,
      isCheckmate: legalMoves.length === 0 && isCheck,
      isStalemate: legalMoves.length === 0 && !isCheck,
      isDraw: false,
    };
    
    this.notifyListeners();
    
    // If AI plays first
    if (mode === GameModeEnum.VS_COMPUTER && 
        position.sideToMove !== this.state.playerColor) {
      this.triggerAiMove();
    }
  }
  
  /**
   * Set difficulty level
   */
  setDifficulty(difficulty: Difficulty): void {
    this.setState({ difficulty });
  }
  
  /**
   * Set play style
   */
  setPlayStyle(playStyle: PlayStyle): void {
    this.setState({ playStyle });
  }
  
  // ========================================================================
  // MOVE HANDLING
  // ========================================================================
  
  /**
   * Select a square (for click-to-move)
   */
  selectSquare(square: number): void {
    const { position, selectedSquare, legalMovesForSelected, gameResult, isThinking } = this.state;
    
    // Can't select during AI thinking or game over
    if (isThinking || gameResult !== GameResultEnum.ONGOING) {
      return;
    }
    
    // Check if clicking on a legal move destination
    if (selectedSquare !== null) {
      const move = legalMovesForSelected.find(m => m.to === square);
      if (move) {
        // Check for promotion
        if (move.promotion) {
          // For simplicity, auto-promote to queen
          // A real implementation would show a promotion dialog
          const queenPromotion = legalMovesForSelected.find(
            m => m.to === square && m.promotion === 'q'
          );
          if (queenPromotion) {
            this.makePlayerMove(queenPromotion);
            return;
          }
        }
        this.makePlayerMove(move);
        return;
      }
    }
    
    // Select new piece
    const piece = position.board[square];
    if (piece && piece.color === position.sideToMove) {
      // Check if it's player's turn in vs AI mode
      if (this.state.gameMode === GameModeEnum.VS_COMPUTER &&
          position.sideToMove !== this.state.playerColor) {
        return;
      }
      
      const allMoves = generateLegalMoves(position);
      const movesFromSquare = allMoves.filter(m => m.from === square);
      
      this.setState({
        selectedSquare: square,
        legalMovesForSelected: movesFromSquare,
      });
    } else {
      // Deselect
      this.setState({
        selectedSquare: null,
        legalMovesForSelected: [],
      });
    }
  }
  
  /**
   * Make a move by drag and drop
   */
  attemptMove(from: number, to: number, promotion?: 'q' | 'r' | 'b' | 'n'): boolean {
    const { position, gameResult, isThinking } = this.state;
    
    if (isThinking || gameResult !== GameResultEnum.ONGOING) {
      return false;
    }
    
    // Check if it's player's turn in vs AI mode
    if (this.state.gameMode === GameModeEnum.VS_COMPUTER &&
        position.sideToMove !== this.state.playerColor) {
      return false;
    }
    
    const legalMoves = generateLegalMoves(position);
    const move = legalMoves.find(m => 
      m.from === from && 
      m.to === to && 
      (promotion === undefined || m.promotion === promotion)
    );
    
    if (move) {
      this.makePlayerMove(move);
      return true;
    }
    
    // Try with default queen promotion
    if (!promotion) {
      const queenPromotion = legalMoves.find(m => 
        m.from === from && m.to === to && m.promotion === 'q'
      );
      if (queenPromotion) {
        this.makePlayerMove(queenPromotion);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Execute a player move
   */
  private makePlayerMove(move: Move): void {
    this.applyMove(move);
    
    // Trigger AI response if needed
    if (this.state.gameMode === GameModeEnum.VS_COMPUTER &&
        this.state.gameResult === GameResultEnum.ONGOING &&
        this.state.position.sideToMove !== this.state.playerColor) {
      this.triggerAiMove();
    }
  }
  
  /**
   * Apply a move to the game state
   */
  private applyMove(move: Move): void {
    const { position, history, currentHistoryIndex } = this.state;
    
    // Generate SAN before making the move
    const notation = moveToSan(position, move);
    
    // Make the move
    const newPosition = makeMove(position, move);
    
    // Check game state
    const legalMoves = generateLegalMoves(newPosition);
    const isCheck = isInCheck(newPosition.board, newPosition.sideToMove);
    const isCheckmate = legalMoves.length === 0 && isCheck;
    const isStalemate = legalMoves.length === 0 && !isCheck;
    const isDraw = isStalemate || 
                   newPosition.halfmoveClock >= 100 || 
                   this.isInsufficientMaterial(newPosition);
    
    // Determine game result
    let gameResult: GameResult = GameResultEnum.ONGOING;
    if (isCheckmate) {
      gameResult = position.sideToMove === ColorEnum.WHITE 
        ? GameResultEnum.WHITE_WINS_CHECKMATE 
        : GameResultEnum.BLACK_WINS_CHECKMATE;
    } else if (isStalemate) {
      gameResult = GameResultEnum.DRAW_STALEMATE;
    } else if (newPosition.halfmoveClock >= 100) {
      gameResult = GameResultEnum.DRAW_FIFTY_MOVES;
    } else if (this.isInsufficientMaterial(newPosition)) {
      gameResult = GameResultEnum.DRAW_INSUFFICIENT_MATERIAL;
    }
    
    // Add to history (truncate if we undid moves)
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push({
      position: newPosition,
      move,
      notation: notation + (isCheckmate ? '#' : isCheck ? '+' : ''),
    });
    
    this.setState({
      position: newPosition,
      gameResult,
      history: newHistory,
      currentHistoryIndex: newHistory.length - 1,
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove: move,
      isCheck,
      isCheckmate,
      isStalemate,
      isDraw,
    });
  }
  
  /**
   * Check for insufficient material draw
   */
  private isInsufficientMaterial(position: Position): boolean {
    const { board } = position;
    
    const whitePieces = getPiecesForColor(board, ColorEnum.WHITE);
    const blackPieces = getPiecesForColor(board, ColorEnum.BLACK);
    
    // Filter out kings
    const whiteNonKings = whitePieces.filter(p => p.piece.type !== PieceType.KING);
    const blackNonKings = blackPieces.filter(p => p.piece.type !== PieceType.KING);
    
    // King vs King
    if (whiteNonKings.length === 0 && blackNonKings.length === 0) {
      return true;
    }
    
    // King + minor piece vs King
    if (whiteNonKings.length === 0 && blackNonKings.length === 1) {
      const piece = blackNonKings[0]?.piece;
      if (piece?.type === PieceType.BISHOP || piece?.type === PieceType.KNIGHT) {
        return true;
      }
    }
    if (blackNonKings.length === 0 && whiteNonKings.length === 1) {
      const piece = whiteNonKings[0]?.piece;
      if (piece?.type === PieceType.BISHOP || piece?.type === PieceType.KNIGHT) {
        return true;
      }
    }
    
    return false;
  }
  
  // ========================================================================
  // AI HANDLING
  // ========================================================================
  
  /**
   * Trigger the AI to make a move
   */
  private async triggerAiMove(): Promise<void> {
    if (this.state.isThinking) {
      console.log('[AI] Already thinking, ignoring trigger');
      return;
    }
    
    console.log('[AI] Triggering AI move...');
    this.setState({ isThinking: true });
    
    // Add delay for realism (400ms)
    await new Promise(resolve => setTimeout(resolve, 400));
    
    try {
      const worker = getEngineWorker();
      const fen = toFen(this.state.position);
      console.log('[AI] Setting position:', fen);
      
      // Set the position
      worker.setPosition(fen);
      
      // Search for best move
      console.log('[AI] Starting search with difficulty:', this.state.difficulty);
      const result = await worker.search({
        difficulty: this.state.difficulty,
        playStyle: this.state.playStyle,
      });
      
      console.log('[AI] Search complete, best move:', result.bestMove);
      
      // Apply the move
      this.setState({ lastSearchResult: result });
      this.applyMove(result.bestMove);
    } catch (error) {
      console.error('[AI] Error during search:', error);
      // Fallback: make a random legal move
      const legalMoves = generateLegalMoves(this.state.position);
      if (legalMoves.length > 0) {
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        if (randomMove) {
          console.log('[AI] Using fallback random move');
          this.applyMove(randomMove);
        }
      }
    } finally {
      console.log('[AI] Finished thinking');
      this.setState({ isThinking: false });
    }
  }
  
  // ========================================================================
  // UNDO / REDO
  // ========================================================================
  
  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    // In vs AI mode, need to undo two moves (player + AI)
    if (this.state.gameMode === GameModeEnum.VS_COMPUTER) {
      return this.state.currentHistoryIndex >= 2 && !this.state.isThinking;
    }
    return this.state.currentHistoryIndex > 0 && !this.state.isThinking;
  }
  
  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.state.currentHistoryIndex < this.state.history.length - 1 && 
           !this.state.isThinking;
  }
  
  /**
   * Undo the last move(s)
   */
  undo(): void {
    if (!this.canUndo()) return;
    
    let newIndex = this.state.currentHistoryIndex - 1;
    
    // In vs AI mode, undo both moves
    if (this.state.gameMode === GameModeEnum.VS_COMPUTER && newIndex > 0) {
      newIndex--;
    }
    
    const historyEntry = this.state.history[newIndex];
    if (!historyEntry) return;
    
    const prevEntry = newIndex > 0 ? this.state.history[newIndex - 1] : null;
    
    const legalMoves = generateLegalMoves(historyEntry.position);
    const isCheck = isInCheck(historyEntry.position.board, historyEntry.position.sideToMove);
    
    this.setState({
      position: historyEntry.position,
      currentHistoryIndex: newIndex,
      gameResult: GameResultEnum.ONGOING,
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove: prevEntry?.move ?? null,
      isCheck,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
    });
  }
  
  /**
   * Redo the last undone move(s)
   */
  redo(): void {
    if (!this.canRedo()) return;
    
    let newIndex = this.state.currentHistoryIndex + 1;
    
    // In vs AI mode, redo both moves if possible
    if (this.state.gameMode === GameModeEnum.VS_COMPUTER && 
        newIndex < this.state.history.length - 1) {
      newIndex++;
    }
    
    const historyEntry = this.state.history[newIndex];
    if (!historyEntry) return;
    
    const prevEntry = this.state.history[newIndex - 1];
    
    const legalMoves = generateLegalMoves(historyEntry.position);
    const isCheck = isInCheck(historyEntry.position.board, historyEntry.position.sideToMove);
    const isCheckmate = legalMoves.length === 0 && isCheck;
    const isStalemate = legalMoves.length === 0 && !isCheck;
    
    this.setState({
      position: historyEntry.position,
      currentHistoryIndex: newIndex,
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove: historyEntry.move,
      isCheck,
      isCheckmate,
      isStalemate,
      isDraw: isStalemate,
    });
  }
  
  // ========================================================================
  // UTILITY
  // ========================================================================
  
  /**
   * Get the FEN of the current position
   */
  getCurrentFen(): string {
    return toFen(this.state.position);
  }
  
  /**
   * Get move history in PGN format
   */
  getMoveHistory(): string[] {
    return this.state.history
      .filter(entry => entry.move !== null)
      .map(entry => entry.notation);
  }
  
  /**
   * Resign the game
   */
  resign(): void {
    if (this.state.gameResult !== GameResultEnum.ONGOING) return;
    
    const gameResult = this.state.position.sideToMove === ColorEnum.WHITE
      ? GameResultEnum.WHITE_RESIGNS
      : GameResultEnum.BLACK_RESIGNS;
    
    this.setState({ gameResult });
  }
  
  /**
   * Offer/accept draw
   */
  draw(): void {
    if (this.state.gameResult !== GameResultEnum.ONGOING) return;
    this.setState({ gameResult: GameResultEnum.DRAW_AGREEMENT });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let gameControllerInstance: GameController | null = null;

export function getGameController(): GameController {
  if (!gameControllerInstance) {
    gameControllerInstance = new GameController();
  }
  return gameControllerInstance;
}

export function resetGameController(): void {
  gameControllerInstance = null;
}
