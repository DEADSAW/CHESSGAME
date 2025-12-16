/**
 * Chess Master Pro - Move History Component
 * 
 * Displays the game move history in standard algebraic notation
 * with navigation and visual highlighting of the current position
 */

import React, { useEffect, useRef } from 'react';
import type { FormattedMove } from '../hooks/useGameController';
import './MoveHistory.css';

interface MoveHistoryProps {
  moves: FormattedMove[];
  currentMoveIndex: number;
  onNavigate: (index: number) => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  currentMoveIndex,
  onNavigate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentMoveRef = useRef<HTMLButtonElement>(null);
  
  // Auto-scroll to current move
  useEffect(() => {
    if (currentMoveRef.current && containerRef.current) {
      const container = containerRef.current;
      const currentMove = currentMoveRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const moveRect = currentMove.getBoundingClientRect();
      
      if (moveRect.bottom > containerRect.bottom || moveRect.top < containerRect.top) {
        currentMove.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentMoveIndex]);
  
  // Group moves into pairs (white and black moves)
  const movePairs: { moveNumber: number; white: FormattedMove | null; black: FormattedMove | null }[] = [];
  
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i] || null,
      black: moves[i + 1] || null,
    });
  }
  
  if (moves.length === 0) {
    return (
      <div className="move-history">
        <div className="move-history-header">
          <h3>Moves</h3>
        </div>
        <div className="move-history-empty">
          <p>No moves yet</p>
          <p className="hint">Make a move to start the game</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="move-history">
      <div className="move-history-header">
        <h3>Moves</h3>
        <span className="move-count">{moves.length} moves</span>
      </div>
      <div className="move-history-list" ref={containerRef}>
        {movePairs.map(({ moveNumber, white, black }) => (
          <div key={moveNumber} className="move-pair">
            <span className="move-number">{moveNumber}.</span>
            {white && (
              <button
                ref={white.index === currentMoveIndex - 1 ? currentMoveRef : undefined}
                className={`move-btn ${white.index === currentMoveIndex - 1 ? 'current' : ''} ${white.isCheck ? 'check' : ''} ${white.isCheckmate ? 'checkmate' : ''}`}
                onClick={() => onNavigate(white.index + 1)}
              >
                {white.san}
              </button>
            )}
            {black && (
              <button
                ref={black.index === currentMoveIndex - 1 ? currentMoveRef : undefined}
                className={`move-btn ${black.index === currentMoveIndex - 1 ? 'current' : ''} ${black.isCheck ? 'check' : ''} ${black.isCheckmate ? 'checkmate' : ''}`}
                onClick={() => onNavigate(black.index + 1)}
              >
                {black.san}
              </button>
            )}
          </div>
        ))}
      </div>
      
      {/* Navigation buttons */}
      <div className="move-history-nav">
        <button 
          className="nav-btn" 
          onClick={() => onNavigate(0)}
          disabled={currentMoveIndex === 0}
          title="Go to start"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6 1.41-1.41zM6 6h2v12H6V6z"/>
          </svg>
        </button>
        <button 
          className="nav-btn" 
          onClick={() => onNavigate(Math.max(0, currentMoveIndex - 1))}
          disabled={currentMoveIndex === 0}
          title="Previous move"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"/>
          </svg>
        </button>
        <button 
          className="nav-btn" 
          onClick={() => onNavigate(Math.min(moves.length, currentMoveIndex + 1))}
          disabled={currentMoveIndex === moves.length}
          title="Next move"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
        <button 
          className="nav-btn" 
          onClick={() => onNavigate(moves.length)}
          disabled={currentMoveIndex === moves.length}
          title="Go to end"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6-1.41 1.41zM16 6h2v12h-2V6z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MoveHistory;
