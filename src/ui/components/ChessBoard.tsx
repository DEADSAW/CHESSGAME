/**
 * Chess Master Pro - Canvas Chess Board Component
 * 
 * Renders the chess board using HTML5 Canvas with full interactivity:
 * - Click-to-move and drag-and-drop piece movement
 * - Legal move highlighting
 * - Last move highlighting
 * - Check highlighting
 * - Board flipping for black's perspective
 * - Promotion dialog
 * - Responsive sizing
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Position, Piece, Move, PieceType } from '../../types';
import { PieceType as PieceTypeEnum, Color } from '../../types';
import { notationToIndex as squareToIndex, indexToNotation as indexToSquare, isLightSquare } from '../../engine/board/constants';
import { generateLegalMoves } from '../../engine/moves/generator';
import { getPieceImage, preloadPieces } from './PieceRenderer';
import './ChessBoard.css';

// ============================================================================
// TYPES
// ============================================================================

interface ChessBoardProps {
  position: Position;
  isFlipped: boolean;
  onMove: (move: Move) => void;
  lastMove: Move | null;
  isPlayerTurn: boolean;
  disabled?: boolean;
  selectedTheme?: BoardTheme;
}

interface DragState {
  piece: Piece;
  fromSquare: number; // Use index instead of Square notation
  currentX: number;
  currentY: number;
}

interface BoardTheme {
  lightSquare: string;
  darkSquare: string;
  selectedSquare: string;
  legalMoveSquare: string;
  lastMoveSquare: string;
  checkSquare: string;
}

// ============================================================================
// THEMES
// ============================================================================

const DEFAULT_THEME: BoardTheme = {
  lightSquare: '#f0d9b5',
  darkSquare: '#b58863',
  selectedSquare: 'rgba(20, 85, 30, 0.5)',
  legalMoveSquare: 'rgba(20, 85, 30, 0.3)',
  lastMoveSquare: 'rgba(255, 255, 0, 0.4)',
  checkSquare: 'rgba(255, 0, 0, 0.5)',
};

// ============================================================================
// CONSTANTS
// ============================================================================

const BOARD_SIZE = 8;
const ANIMATION_DURATION = 150;

// ============================================================================
// COMPONENT
// ============================================================================

export const ChessBoard: React.FC<ChessBoardProps> = ({
  position,
  isFlipped,
  onMove,
  lastMove,
  isPlayerTurn,
  disabled = false,
  selectedTheme = DEFAULT_THEME,
}) => {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [squareSize, setSquareSize] = useState(80);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showPromotion, setShowPromotion] = useState<{
    from: number;
    to: number;
    color: Color;
  } | null>(null);
  
  // Computed legal moves for selected piece
  const legalMoves = useMemo(() => {
    if (selectedSquare === null) return [];
    return generateLegalMoves(position).filter(
      move => move.from === selectedSquare
    );
  }, [position, selectedSquare]);
  
  // All legal moves for current position
  const allLegalMoves = useMemo(() => {
    return generateLegalMoves(position);
  }, [position]);
  
  // Find king in check
  const kingInCheck = useMemo((): number | null => {    
    // Find king of side to move
    for (let i = 0; i < 64; i++) {
      const piece = position.board[i];
      if (piece && piece.type === PieceTypeEnum.KING && piece.color === position.sideToMove) {
        return i;
      }
    }
    return null;
  }, [position]);

  // ============================================================================
  // COORDINATE CONVERSION
  // ============================================================================
  
  const getSquareFromCoords = useCallback((x: number, y: number): number | null => {
    const col = Math.floor(x / squareSize);
    const row = Math.floor(y / squareSize);
    
    if (col < 0 || col >= 8 || row < 0 || row >= 8) return null;
    
    const file = isFlipped ? 7 - col : col;
    const rank = isFlipped ? row : 7 - row;
    
    return rank * 8 + file;
  }, [squareSize, isFlipped]);
  
  const getSquareCoords = useCallback((squareIndex: number): { x: number; y: number } => {
    const file = squareIndex % 8;
    const rank = Math.floor(squareIndex / 8);
    
    const col = isFlipped ? 7 - file : file;
    const row = isFlipped ? rank : 7 - rank;
    
    return { x: col * squareSize, y: row * squareSize };
  }, [squareSize, isFlipped]);

  // ============================================================================
  // CANVAS RENDERING
  // ============================================================================
  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const boardPixelSize = squareSize * BOARD_SIZE;
    
    // Clear canvas
    ctx.clearRect(0, 0, boardPixelSize, boardPixelSize);
    
    // Draw squares
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const file = isFlipped ? 7 - col : col;
        const rank = isFlipped ? row : 7 - row;
        const isLight = isLightSquare(file, rank);
        
        const x = col * squareSize;
        const y = row * squareSize;
        
        // Base square color
        ctx.fillStyle = isLight ? selectedTheme.lightSquare : selectedTheme.darkSquare;
        ctx.fillRect(x, y, squareSize, squareSize);
        
        const squareIndex = rank * 8 + file;
        
        // Last move highlight
        if (lastMove && (lastMove.from === squareIndex || lastMove.to === squareIndex)) {
          ctx.fillStyle = selectedTheme.lastMoveSquare;
          ctx.fillRect(x, y, squareSize, squareSize);
        }
        
        // Selected square highlight
        if (selectedSquare === squareIndex) {
          ctx.fillStyle = selectedTheme.selectedSquare;
          ctx.fillRect(x, y, squareSize, squareSize);
        }
        
        // King in check highlight
        if (kingInCheck === squareIndex) {
          ctx.fillStyle = selectedTheme.checkSquare;
          ctx.fillRect(x, y, squareSize, squareSize);
        }
        
        // Legal move highlight
        const isLegalTarget = legalMoves.some(m => m.to === squareIndex);
        if (isLegalTarget) {
          const piece = position.board[squareIndex];
          ctx.fillStyle = selectedTheme.legalMoveSquare;
          
          if (piece) {
            // Draw corner triangles for capture moves
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + squareSize * 0.25, y);
            ctx.lineTo(x, y + squareSize * 0.25);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(x + squareSize, y);
            ctx.lineTo(x + squareSize - squareSize * 0.25, y);
            ctx.lineTo(x + squareSize, y + squareSize * 0.25);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(x, y + squareSize);
            ctx.lineTo(x + squareSize * 0.25, y + squareSize);
            ctx.lineTo(x, y + squareSize - squareSize * 0.25);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(x + squareSize, y + squareSize);
            ctx.lineTo(x + squareSize - squareSize * 0.25, y + squareSize);
            ctx.lineTo(x + squareSize, y + squareSize - squareSize * 0.25);
            ctx.fill();
          } else {
            // Draw circle for non-capture moves
            ctx.beginPath();
            ctx.arc(
              x + squareSize / 2,
              y + squareSize / 2,
              squareSize * 0.15,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
    }
    
    // Draw coordinates
    ctx.font = `bold ${squareSize * 0.15}px sans-serif`;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const file = isFlipped ? 7 - i : i;
      const rank = isFlipped ? i : 7 - i;
      
      // File labels (a-h) at bottom
      const fileLabel = 'abcdefgh'[file];
      ctx.fillStyle = (file + (isFlipped ? 1 : 0)) % 2 === 0 
        ? selectedTheme.darkSquare 
        : selectedTheme.lightSquare;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(fileLabel, (i + 1) * squareSize - 3, boardPixelSize - 3);
      
      // Rank labels (1-8) on left
      const rankLabel = `${rank + 1}`;
      ctx.fillStyle = (rank + (isFlipped ? 0 : 1)) % 2 === 0 
        ? selectedTheme.darkSquare 
        : selectedTheme.lightSquare;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(rankLabel, 3, i * squareSize + 3);
    }
    
    // Draw pieces (except dragged piece)
    const pieceSize = squareSize * 0.9;
    const pieceOffset = (squareSize - pieceSize) / 2;
    
    for (let i = 0; i < 64; i++) {
      const piece = position.board[i];
      if (!piece) continue;
      
      // Skip dragged piece
      if (dragState && dragState.fromSquare === i) continue;
      
      const coords = getSquareCoords(i);
      const pieceImage = getPieceImage(piece.type, piece.color, Math.round(pieceSize));
      
      ctx.drawImage(
        pieceImage,
        coords.x + pieceOffset,
        coords.y + pieceOffset,
        pieceSize,
        pieceSize
      );
    }
    
    // Draw dragged piece on top
    if (dragState) {
      const pieceImage = getPieceImage(dragState.piece.type, dragState.piece.color, Math.round(pieceSize));
      ctx.drawImage(
        pieceImage,
        dragState.currentX - pieceSize / 2,
        dragState.currentY - pieceSize / 2,
        pieceSize,
        pieceSize
      );
    }
  }, [
    squareSize,
    isFlipped,
    position,
    selectedSquare,
    dragState,
    lastMove,
    legalMoves,
    kingInCheck,
    selectedTheme,
    getSquareCoords,
  ]);

  // ============================================================================
  // RESIZE HANDLING
  // ============================================================================
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const size = Math.min(entry.contentRect.width, entry.contentRect.height);
        const newSquareSize = Math.floor(size / BOARD_SIZE);
        setSquareSize(newSquareSize);
      }
    });
    
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);
  
  // Preload pieces when square size changes
  useEffect(() => {
    const pieceSize = Math.round(squareSize * 0.9);
    preloadPieces(pieceSize);
  }, [squareSize]);
  
  // Render on state changes
  useEffect(() => {
    render();
  }, [render]);

  // ============================================================================
  // INTERACTION HANDLERS
  // ============================================================================
  
  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX: number;
    let clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);
  
  const tryMove = useCallback((from: number, to: number, promotionPiece?: PieceType) => {
    // Find matching legal move
    const move = allLegalMoves.find(m => {
      if (m.from !== from || m.to !== to) return false;
      if (m.promotion) {
        return m.promotion === promotionPiece;
      }
      return true;
    });
    
    if (move) {
      onMove(move);
      setSelectedSquare(null);
    } else {
      // Check if this is a promotion move without piece selected
      const promoMove = allLegalMoves.find(m => 
        m.from === from && m.to === to && m.promotion
      );
      
      if (promoMove) {
        // Show promotion dialog
        const piece = position.board[from];
        if (piece) {
          setShowPromotion({ from, to, color: piece.color });
        }
      }
    }
  }, [allLegalMoves, onMove, position.board]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !isPlayerTurn) return;
    
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const square = getSquareFromCoords(coords.x, coords.y);
    
    if (square === null) return;
    
    const piece = position.board[square];
    
    if (selectedSquare !== null) {
      // If clicking on a legal move target, make the move
      if (legalMoves.some(m => m.to === square)) {
        tryMove(selectedSquare, square);
        return;
      }
      
      // If clicking on own piece, select it
      if (piece && piece.color === position.sideToMove) {
        setSelectedSquare(square);
        setDragState({
          piece,
          fromSquare: square,
          currentX: coords.x,
          currentY: coords.y,
        });
        return;
      }
      
      // Otherwise deselect
      setSelectedSquare(null);
      return;
    }
    
    // No piece selected - try to select one
    if (piece && piece.color === position.sideToMove) {
      setSelectedSquare(square);
      setDragState({
        piece,
        fromSquare: square,
        currentX: coords.x,
        currentY: coords.y,
      });
    }
  }, [disabled, isPlayerTurn, getCanvasCoords, getSquareFromCoords, position, selectedSquare, legalMoves, tryMove]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragState) return;
    
    e.preventDefault();
    const coords = getCanvasCoords(e);
    
    setDragState(prev => prev ? {
      ...prev,
      currentX: coords.x,
      currentY: coords.y,
    } : null);
  }, [dragState, getCanvasCoords]);
  
  const handleMouseUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragState) return;
    
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const toSquare = getSquareFromCoords(coords.x, coords.y);
    
    if (toSquare && toSquare !== dragState.fromSquare) {
      tryMove(dragState.fromSquare, toSquare);
    }
    
    setDragState(null);
  }, [dragState, getCanvasCoords, getSquareFromCoords, tryMove]);
  
  const handleMouseLeave = useCallback(() => {
    setDragState(null);
  }, []);
  
  // Handle promotion selection
  const handlePromotion = useCallback((pieceType: PieceType) => {
    if (!showPromotion) return;
    
    tryMove(showPromotion.from, showPromotion.to, pieceType);
    setShowPromotion(null);
    setSelectedSquare(null);
  }, [showPromotion, tryMove]);
  
  const cancelPromotion = useCallback(() => {
    setShowPromotion(null);
    setSelectedSquare(null);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  const boardPixelSize = squareSize * BOARD_SIZE;
  
  return (
    <div 
      ref={containerRef} 
      className="chess-board-container"
      data-disabled={disabled || !isPlayerTurn}
    >
      <canvas
        ref={canvasRef}
        width={boardPixelSize}
        height={boardPixelSize}
        className="chess-board-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      />
      
      {/* Promotion Dialog */}
      {showPromotion && (
        <div className="promotion-overlay" onClick={cancelPromotion}>
          <div 
            className="promotion-dialog"
            onClick={e => e.stopPropagation()}
            style={{
              '--square-size': `${squareSize}px`,
            } as React.CSSProperties}
          >
            <div className="promotion-title">Choose Promotion</div>
            <div className="promotion-pieces">
              {([PieceTypeEnum.QUEEN, PieceTypeEnum.ROOK, PieceTypeEnum.BISHOP, PieceTypeEnum.KNIGHT] as PieceType[]).map(type => (
                <button
                  key={type}
                  className="promotion-piece-btn"
                  onClick={() => handlePromotion(type)}
                >
                  <canvas
                    ref={el => {
                      if (el) {
                        const ctx = el.getContext('2d');
                        if (ctx) {
                          const pieceSize = squareSize * 0.8;
                          el.width = pieceSize;
                          el.height = pieceSize;
                          const pieceImage = getPieceImage(type, showPromotion.color, Math.round(pieceSize));
                          ctx.drawImage(pieceImage, 0, 0, pieceSize, pieceSize);
                        }
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessBoard;
