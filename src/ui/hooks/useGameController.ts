/**
 * Chess Master Pro - React Hook for Game Controller
 */

import { useState, useEffect, useCallback } from 'react';
import { GameController, getGameController, GameControllerState } from '../../game';

/**
 * Custom hook for using the game controller with React state
 */
export function useGameController(): {
  state: GameControllerState;
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
  
  return { state, controller };
}

/**
 * Hook for board-specific state
 */
export function useBoardState() {
  const { state, controller } = useGameController();
  
  const selectSquare = useCallback((square: number) => {
    controller.selectSquare(square);
  }, [controller]);
  
  const attemptMove = useCallback((from: number, to: number, promotion?: 'q' | 'r' | 'b' | 'n') => {
    return controller.attemptMove(from, to, promotion);
  }, [controller]);
  
  return {
    position: state.position,
    selectedSquare: state.selectedSquare,
    legalMovesForSelected: state.legalMovesForSelected,
    lastMove: state.lastMove,
    isCheck: state.isCheck,
    isThinking: state.isThinking,
    gameResult: state.gameResult,
    selectSquare,
    attemptMove,
  };
}

/**
 * Hook for game controls
 */
export function useGameControls() {
  const { state, controller } = useGameController();
  
  const newGame = useCallback((
    mode: Parameters<typeof controller.newGame>[0],
    options?: Parameters<typeof controller.newGame>[1]
  ) => {
    controller.newGame(mode, options);
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
    gameMode: state.gameMode,
    gameResult: state.gameResult,
    difficulty: state.difficulty,
    playStyle: state.playStyle,
    canUndo: controller.canUndo(),
    canRedo: controller.canRedo(),
    newGame,
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
  const { state } = useGameController();
  
  return {
    history: state.history,
    currentIndex: state.currentHistoryIndex,
    moveNotations: state.history
      .filter(entry => entry.move !== null)
      .map((entry, i) => ({
        index: i,
        notation: entry.notation,
        isWhite: i % 2 === 0,
        moveNumber: Math.floor(i / 2) + 1,
      })),
  };
}

/**
 * Hook for AI analysis display
 */
export function useAIAnalysis() {
  const { state } = useGameController();
  
  return {
    lastSearchResult: state.lastSearchResult,
    isThinking: state.isThinking,
  };
}
