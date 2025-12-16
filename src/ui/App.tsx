/**
 * Chess Master Pro - Main Application Component
 * 
 * The root component that orchestrates all game functionality including:
 * - Game state management
 * - AI integration
 * - UI layout and responsive design
 * - Keyboard shortcuts
 */

import React, { useEffect, useState, useCallback } from 'react';
import { GameController } from '../game/GameController';
import { 
  ChessBoard, 
  StatusBar, 
  MoveHistory, 
  AIAnalysis, 
  Settings 
} from './components';
import { 
  useGameState, 
  useBoardState, 
  useGameControls, 
  useMoveHistory,
  useAIAnalysis,
  useUISettings 
} from './hooks';
import type { GameMode, DifficultyLevel, Color, Move } from '../types';
import { 
  GameMode as GameModeEnum, 
  DifficultyLevel as DifficultyEnum,
  Color as ColorEnum,
  GameResult 
} from '../types';
import './styles/global.css';
import './styles/App.css';

// ============================================================================
// GAME CONTROLLER SINGLETON
// ============================================================================

const gameController = new GameController();

// ============================================================================
// APP COMPONENT
// ============================================================================

export const App: React.FC = () => {
  // Game state
  const gameState = useGameState();
  const boardState = useBoardState();
  const gameControls = useGameControls();
  const moveHistoryData = useMoveHistory();
  const aiAnalysis = useAIAnalysis();
  const uiSettings = useUISettings();
  
  // Local state for settings panel
  const [pendingMode, setPendingMode] = useState<GameMode>(GameModeEnum.VS_COMPUTER);
  const [pendingDifficulty, setPendingDifficulty] = useState<DifficultyLevel>(DifficultyEnum.MEDIUM);
  const [pendingPlayerColor, setPendingPlayerColor] = useState<Color>(ColorEnum.WHITE);
  const [showSettings, setShowSettings] = useState(true);
  
  // ============================================================================
  // GAME CONTROL HANDLERS
  // ============================================================================
  
  const handleNewGame = useCallback(() => {
    gameControls.startNewGame(pendingMode, pendingDifficulty, pendingPlayerColor);
    setShowSettings(false);
  }, [gameControls, pendingMode, pendingDifficulty, pendingPlayerColor]);
  
  const handleMove = useCallback((move: Move) => {
    boardState.attemptMove(move.from, move.to, move.promotion);
  }, [boardState]);
  
  const handleNavigate = useCallback((moveIndex: number) => {
    // This would require implementing position navigation in GameController
    // For now, we'll just show the current position
  }, []);
  
  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        gameControls.undo();
      }
      // Ctrl+Y: Redo
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        gameControls.redo();
      }
      // Ctrl+N: New Game
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setShowSettings(true);
      }
      // F: Flip board
      if (e.key === 'f' && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          uiSettings.toggleFlip();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameControls, uiSettings]);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isGameInProgress = gameState.history.length > 1;
  const isGameOver = gameState.gameResult !== GameResult.ONGOING;
  
  // Determine if it's the player's turn
  const isPlayerTurn = (() => {
    if (gameState.gameMode === GameModeEnum.PASS_AND_PLAY) {
      return true; // Always player's turn in pass and play
    }
    if (gameState.gameMode === GameModeEnum.VS_COMPUTER) {
      return gameState.position.sideToMove === gameState.playerColor;
    }
    return true;
  })();
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="app" data-theme={uiSettings.theme}>
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="currentColor" className="logo-icon">
            <path d="M19,22H5V20H19V22M17,10C15.58,10 14.26,10.77 13.55,12H13V7H16V5H13V2H11V5H8V7H11V12H10.45C9.35,10.09 6.9,9.43 5,10.54C3.07,11.64 2.42,14.09 3.5,16C4.24,17.24 5.57,18 7,18H17A4,4 0 0,0 21,14A4,4 0 0,0 17,10Z" />
          </svg>
          <h1>Chess Master Pro</h1>
        </div>
        <div className="header-actions">
          <button 
            className="header-btn"
            onClick={() => uiSettings.toggleTheme()}
            title={`Switch to ${uiSettings.theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {uiSettings.theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z" />
              </svg>
            )}
          </button>
          <button 
            className="header-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
            </svg>
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="app-main">
        <div className="app-layout">
          {/* Left Panel - Board */}
          <div className="board-section">
            <StatusBar
              sideToMove={gameState.position.sideToMove}
              gameResult={gameState.gameResult}
              gameMode={gameState.gameMode}
              isCheck={gameState.isCheck}
              isThinking={gameState.isThinking}
              moveCount={gameState.history.length - 1}
              onNewGame={() => setShowSettings(true)}
              onUndo={gameControls.undo}
              onRedo={gameControls.redo}
              canUndo={gameControls.canUndo}
              canRedo={gameControls.canRedo}
              onFlipBoard={uiSettings.toggleFlip}
            />
            
            <ChessBoard
              position={gameState.position}
              isFlipped={uiSettings.isFlipped}
              onMove={handleMove}
              lastMove={gameState.lastMove}
              isPlayerTurn={isPlayerTurn && !isGameOver && !gameState.isThinking}
              disabled={isGameOver || gameState.isThinking}
            />
          </div>
          
          {/* Right Panel - Info */}
          <div className="info-section">
            {showSettings ? (
              <Settings
                gameMode={pendingMode}
                difficulty={pendingDifficulty}
                playerColor={pendingPlayerColor}
                onModeChange={setPendingMode}
                onDifficultyChange={setPendingDifficulty}
                onPlayerColorChange={setPendingPlayerColor}
                onNewGame={handleNewGame}
                isGameInProgress={isGameInProgress}
              />
            ) : (
              <>
                <MoveHistory
                  moves={moveHistoryData.moveNotations}
                  currentMoveIndex={moveHistoryData.currentIndex}
                  onNavigate={handleNavigate}
                />
                
                {gameState.gameMode === GameModeEnum.VS_COMPUTER && (
                  <AIAnalysis
                    searchResult={aiAnalysis.lastSearchResult}
                    isThinking={gameState.isThinking}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="app-footer">
        <p>
          Chess Master Pro &copy; 2024 | Built with React + TypeScript | 
          <span className="footer-hint"> Press F to flip board, Ctrl+Z/Y to undo/redo</span>
        </p>
      </footer>
    </div>
  );
};

export default App;
