/**
 * Chess Master Pro - React Hook for Game Controller
 */

import { useState, useEffect, useCallback } from 'react';
import { GameController, getGameController, GameControllerState } from '../../game';
import type { GameMode, PlayStyle } from '../../types';

/** Formatted move for display */
export interface FormattedMove {
  index: number;
  notation: string;
  san: string;  // Alias for notation
  isWhite: boolean;
  moveNumber: number;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

/**
 * Custom hook for using the game controller with React state
 */
export function useGameController(): GameControllerState & {
  controller: GameController;
} {
  const controller = getGameController();
  const [state, setState] = useState<GameControllerState>(controller.getState());
  
  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = controller.subscribe((newState) => {
      setState(newState);
    });
    
    // Initial state sync
    setState(controller.getState());
    
    return unsubscribe;
  }, [controller]);
  
  return { ...state, controller };
}

/**
 * Hook for board-specific state
 */
export function useBoardState() {
  const gameState = useGameController();
  const { controller } = gameState;
  
  const selectSquare = useCallback((square: number) => {
    controller.selectSquare(square);
  }, [controller]);
  
  const attemptMove = useCallback((from: number, to: number, promotion?: 'q' | 'r' | 'b' | 'n') => {
    return controller.attemptMove(from, to, promotion);
  }, [controller]);
  
  return {
    position: gameState.position,
    selectedSquare: gameState.selectedSquare,
    legalMovesForSelected: gameState.legalMovesForSelected,
    lastMove: gameState.lastMove,
    isCheck: gameState.isCheck,
    isThinking: gameState.isThinking,
    gameResult: gameState.gameResult,
    selectSquare,
    attemptMove,
  };
}

/**
 * Hook for game controls
 */
export function useGameControls() {
  const gameState = useGameController();
  const { controller } = gameState;
  
  const newGame = useCallback((mode: GameMode, options?: any) => {
    controller.newGame(mode, options);
  }, [controller]);

  const startNewGame = useCallback((mode: GameMode, difficulty?: any, playerColor?: any) => {
    controller.newGame(mode, { difficulty, playerColor });
  }, [controller]);
  
  const undo = useCallback(() => {
    controller.undo();
  }, [controller]);
  
  const redo = useCallback(() => {
    controller.redo();
  }, [controller]);
  
  const resign = useCallback(() => {
    controller.resign();
  }, [controller]);
  
  const draw = useCallback(() => {
    controller.draw();
  }, [controller]);
  
  return {
    gameMode: gameState.gameMode,
    gameResult: gameState.gameResult,
    difficulty: gameState.difficulty,
    playStyle: gameState.playStyle,
    canUndo: controller.canUndo(),
    canRedo: controller.canRedo(),
    newGame,
    startNewGame,
    undo,
    redo,
    resign,
    draw,
    setDifficulty: controller.setDifficulty.bind(controller),
    setPlayStyle: controller.setPlayStyle.bind(controller),
  };
}

/**
 * Hook for move history
 */
export function useMoveHistory() {
  const gameState = useGameController();
  
  return {
    history: gameState.history,
    currentIndex: gameState.currentHistoryIndex,
    moveNotations: gameState.history
      .filter(entry => entry.move !== null)
      .map((entry, i): FormattedMove => ({
        index: i,
        notation: entry.notation,
        san: entry.notation,  // Alias
        isWhite: i % 2 === 0,
        moveNumber: Math.floor(i / 2) + 1,
      })),
  };
}

/**
 * Hook for AI analysis display
 */
export function useAIAnalysis() {
  const gameState = useGameController();
  
  return {
    lastSearchResult: gameState.lastSearchResult,
    isThinking: gameState.isThinking,
  };
}

/**
 * Hook for UI settings
 */
export function useUISettings() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isFlipped, setIsFlipped] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const toggleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  return {
    theme,
    isFlipped,
    settings: { theme, isFlipped },
    toggleTheme,
    toggleFlip,
    updateSettings: () => {},
  };
}
