/**
 * Chess Master Pro - Game Status Bar Component
 * 
 * Displays current game status, turn indicator, and game controls
 */

import React from 'react';
import type { Color, GameResult, GameMode } from '../../types';
import { GameResult as GameResultEnum, Color as ColorEnum, GameMode as GameModeEnum } from '../../types';
import './StatusBar.css';

interface StatusBarProps {
  sideToMove: Color;
  gameResult: GameResult;
  gameMode: GameMode;
  isCheck: boolean;
  isThinking: boolean;
  moveCount: number;
  onNewGame: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onFlipBoard: () => void;
  playerColor?: Color; // Add playerColor to determine if it's player's turn
}

export const StatusBar: React.FC<StatusBarProps> = ({
  sideToMove,
  gameResult,
  gameMode,
  isCheck,
  isThinking,
  moveCount,
  onNewGame,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onFlipBoard,
  playerColor,
}) => {
  // Determine if it's the player's turn
  const isPlayerTurn = gameMode === GameModeEnum.PASS_AND_PLAY || 
                       (gameMode === GameModeEnum.VS_COMPUTER && sideToMove === playerColor);
  
  const isGameOver = gameResult !== GameResultEnum.ONGOING;
  
  // Helper to determine if we should show the turn hint
  const shouldShowTurnHint = (): boolean => {
    return !isGameOver && 
           isPlayerTurn && 
           !isThinking && 
           moveCount === 0 && 
           gameMode === GameModeEnum.VS_COMPUTER;
  };
  
  // Get status message
  const getStatusMessage = (): string => {
    if (gameResult !== GameResultEnum.ONGOING) {
      switch (gameResult) {
        case GameResultEnum.WHITE_WINS_CHECKMATE:
          return 'Checkmate! White wins';
        case GameResultEnum.BLACK_WINS_CHECKMATE:
          return 'Checkmate! Black wins';
        case GameResultEnum.DRAW_STALEMATE:
          return 'Draw by stalemate';
        case GameResultEnum.DRAW_INSUFFICIENT_MATERIAL:
          return 'Draw by insufficient material';
        case GameResultEnum.DRAW_FIFTY_MOVES:
          return 'Draw by fifty-move rule';
        case GameResultEnum.DRAW_THREEFOLD_REPETITION:
          return 'Draw by threefold repetition';
        case GameResultEnum.DRAW_AGREEMENT:
          return 'Draw by agreement';
        default:
          return 'Game Over';
      }
    }
    
    if (isThinking) {
      return 'AI is thinking...';
    }
    
    const turnText = sideToMove === ColorEnum.WHITE ? 'White' : 'Black';
    
    // Show if it's player's turn in VS_COMPUTER mode
    if (gameMode === GameModeEnum.VS_COMPUTER) {
      if (isPlayerTurn) {
        if (isCheck) {
          return `Your turn (${turnText}) - You're in check!`;
        }
        return `Your turn - Move ${turnText}`;
      } else {
        return `AI's turn (${turnText})`;
      }
    }
    
    // Pass and play mode
    if (isCheck) {
      return `${turnText} is in check!`;
    }
    
    return `${turnText} to move`;
  };
  
  // Get mode display
  const getModeDisplay = (): string => {
    switch (gameMode) {
      case GameModeEnum.PASS_AND_PLAY:
        return 'Pass & Play';
      case GameModeEnum.VS_COMPUTER:
        return 'vs Computer';
      default:
        return '';
    }
  };
  
  return (
    <div className="status-bar">
      <div className="status-info">
        <div className="turn-indicator" data-color={sideToMove} data-gameover={isGameOver} data-thinking={isThinking}>
          <div className="turn-piece" />
          {isThinking && <div className="thinking-pulse" />}
        </div>
        <div className="status-text">
          <div className="status-main">
            {getStatusMessage()}
            {isThinking && <span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span>}
          </div>
          <div className="status-sub">
            <span className="game-mode">{getModeDisplay()}</span>
            {moveCount > 0 && <span className="move-count">Move {Math.ceil(moveCount / 2)}</span>}
            {shouldShowTurnHint() && (
              <span className="turn-hint">Click a piece to move</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="status-controls">
        <button 
          className="control-btn" 
          onClick={onUndo}
          disabled={!canUndo || isThinking}
          title="Undo (Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
          </svg>
        </button>
        <button 
          className="control-btn" 
          onClick={onRedo}
          disabled={!canRedo || isThinking}
          title="Redo (Ctrl+Y)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
          </svg>
        </button>
        <button 
          className="control-btn" 
          onClick={onFlipBoard}
          title="Flip board"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 6V4.5C12 3.12 10.88 2 9.5 2c-1.1 0-2.04.71-2.38 1.69L3 12l4.12 8.31C7.46 21.29 8.4 22 9.5 22c1.38 0 2.5-1.12 2.5-2.5V18h8v-2h-8V8h6l2-2H12z"/>
          </svg>
        </button>
        <button 
          className="control-btn primary" 
          onClick={onNewGame}
          title="New game"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
