/**
 * Chess Master Pro - Settings Panel Component
 * 
 * Game settings including mode selection, difficulty, and UI preferences
 */

import React from 'react';
import type { GameMode, DifficultyLevel, Color } from '../../types';
import { 
  GameMode as GameModeEnum, 
  DifficultyLevel as DifficultyEnum,
  Color as ColorEnum 
} from '../../types';
import './Settings.css';

interface SettingsProps {
  gameMode: GameMode;
  difficulty: DifficultyLevel;
  playerColor: Color;
  onModeChange: (mode: GameMode) => void;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onPlayerColorChange: (color: Color) => void;
  onNewGame: () => void;
  isGameInProgress: boolean;
}

export const Settings: React.FC<SettingsProps> = ({
  gameMode,
  difficulty,
  playerColor,
  onModeChange,
  onDifficultyChange,
  onPlayerColorChange,
  onNewGame,
  isGameInProgress,
}) => {
  const difficulties = [
    { value: DifficultyEnum.BEGINNER, label: 'Beginner', desc: 'Learning the basics' },
    { value: DifficultyEnum.EASY, label: 'Easy', desc: 'Casual play' },
    { value: DifficultyEnum.MEDIUM, label: 'Medium', desc: 'Moderate challenge' },
    { value: DifficultyEnum.HARD, label: 'Hard', desc: 'Strong opponent' },
    { value: DifficultyEnum.EXPERT, label: 'Expert', desc: 'Maximum strength' },
  ];
  
  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>Game Settings</h3>
      </div>
      
      {/* Game Mode Selection */}
      <div className="settings-section">
        <label className="settings-label">Game Mode</label>
        <div className="mode-buttons">
          <button
            className={`mode-btn ${gameMode === GameModeEnum.PASS_AND_PLAY ? 'active' : ''}`}
            onClick={() => onModeChange(GameModeEnum.PASS_AND_PLAY)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <span>Pass & Play</span>
          </button>
          <button
            className={`mode-btn ${gameMode === GameModeEnum.VS_COMPUTER ? 'active' : ''}`}
            onClick={() => onModeChange(GameModeEnum.VS_COMPUTER)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
            </svg>
            <span>vs Computer</span>
          </button>
        </div>
      </div>
      
      {/* AI Settings (only for vs Computer mode) */}
      {gameMode === GameModeEnum.VS_COMPUTER && (
        <>
          {/* Difficulty Selection */}
          <div className="settings-section">
            <label className="settings-label">AI Difficulty</label>
            <div className="difficulty-list">
              {difficulties.map(({ value, label, desc }) => (
                <button
                  key={value}
                  className={`difficulty-btn ${difficulty === value ? 'active' : ''}`}
                  onClick={() => onDifficultyChange(value)}
                >
                  <span className="difficulty-name">{label}</span>
                  <span className="difficulty-desc">{desc}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Player Color Selection */}
          <div className="settings-section">
            <label className="settings-label">Play as</label>
            <p className="settings-hint">Note: White always moves first in chess</p>
            <div className="color-buttons">
              <button
                className={`color-btn white ${playerColor === ColorEnum.WHITE ? 'active' : ''}`}
                onClick={() => onPlayerColorChange(ColorEnum.WHITE)}
              >
                <div className="color-piece white" />
                <span>White</span>
                <span className="color-hint">You move first</span>
              </button>
              <button
                className={`color-btn black ${playerColor === ColorEnum.BLACK ? 'active' : ''}`}
                onClick={() => onPlayerColorChange(ColorEnum.BLACK)}
              >
                <div className="color-piece black" />
                <span>Black</span>
                <span className="color-hint">AI moves first</span>
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* New Game Button */}
      <div className="settings-section">
        <button className="new-game-btn" onClick={onNewGame}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          <span>{isGameInProgress ? 'Start New Game' : 'Start Game'}</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;
