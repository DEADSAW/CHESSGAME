/**
 * Chess Master Pro - Move Generation Tests
 * 
 * Comprehensive tests for the move generator including:
 * - Basic piece movement
 * - Special moves (castling, en passant, promotion)
 * - Check and checkmate detection
 * - Perft (Performance Test) for move generation accuracy
 */

import { parseFEN, STARTING_FEN } from '../engine/board/fen';
import { generateLegalMoves, isInCheck, isCheckmate, isStalemate } from '../engine/moves/generator';
import type { Position, Square } from '../types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function countMoves(position: Position): number {
  return generateLegalMoves(position).length;
}

function hasMove(position: Position, from: Square, to: Square): boolean {
  const moves = generateLegalMoves(position);
  return moves.some(m => m.from === from && m.to === to);
}

function perft(position: Position, depth: number): number {
  if (depth === 0) return 1;
  
  const moves = generateLegalMoves(position);
  if (depth === 1) return moves.length;
  
  let nodes = 0;
  for (const move of moves) {
    // Make move
    const { makeMove } = require('../engine/moves/generator');
    const newPosition = makeMove(position, move);
    nodes += perft(newPosition, depth - 1);
  }
  
  return nodes;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Move Generator', () => {
  describe('Starting Position', () => {
    it('should generate 20 legal moves from starting position', () => {
      const position = parseFEN(STARTING_FEN);
      expect(countMoves(position)).toBe(20);
    });
    
    it('should allow e2-e4 pawn move', () => {
      const position = parseFEN(STARTING_FEN);
      expect(hasMove(position, 'e2', 'e4')).toBe(true);
    });
    
    it('should allow Nf3 knight move', () => {
      const position = parseFEN(STARTING_FEN);
      expect(hasMove(position, 'g1', 'f3')).toBe(true);
    });
    
    it('should not allow Bf1-a6 (blocked by pawn)', () => {
      const position = parseFEN(STARTING_FEN);
      expect(hasMove(position, 'f1', 'a6')).toBe(false);
    });
  });
  
  describe('Pawn Movement', () => {
    it('should allow pawn to move forward one square', () => {
      const position = parseFEN('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      expect(hasMove(position, 'e7', 'e6')).toBe(true);
    });
    
    it('should allow pawn double move from starting rank', () => {
      const position = parseFEN(STARTING_FEN);
      expect(hasMove(position, 'e2', 'e4')).toBe(true);
    });
    
    it('should not allow pawn double move after moving', () => {
      const position = parseFEN('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      expect(hasMove(position, 'e4', 'e6')).toBe(false);
    });
    
    it('should allow diagonal pawn capture', () => {
      const position = parseFEN('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
      expect(hasMove(position, 'e4', 'd5')).toBe(true);
    });
    
    it('should not allow pawn to move forward onto occupied square', () => {
      const position = parseFEN('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2');
      expect(hasMove(position, 'e4', 'e5')).toBe(false);
    });
  });
  
  describe('En Passant', () => {
    it('should allow en passant capture', () => {
      const position = parseFEN('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 1');
      expect(hasMove(position, 'f5', 'e6')).toBe(true);
    });
    
    it('should not allow en passant when not available', () => {
      const position = parseFEN('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq - 0 1');
      expect(hasMove(position, 'f5', 'e6')).toBe(false);
    });
  });
  
  describe('Castling', () => {
    it('should allow kingside castling when legal', () => {
      const position = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      expect(hasMove(position, 'e1', 'g1')).toBe(true);
    });
    
    it('should allow queenside castling when legal', () => {
      const position = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      expect(hasMove(position, 'e1', 'c1')).toBe(true);
    });
    
    it('should not allow castling through check', () => {
      const position = parseFEN('r3k2r/pppp1ppp/8/4r3/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
      expect(hasMove(position, 'e1', 'g1')).toBe(false);
    });
    
    it('should not allow castling when king is in check', () => {
      const position = parseFEN('r3k2r/pppp1ppp/8/8/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
      const positionInCheck = parseFEN('r3k2r/pppp1ppp/8/8/4r3/8/PPPP1PPP/R3K2R w KQkq - 0 1');
      expect(isInCheck(positionInCheck, positionInCheck.sideToMove)).toBe(true);
      expect(hasMove(positionInCheck, 'e1', 'g1')).toBe(false);
    });
    
    it('should not allow castling when rights are lost', () => {
      const position = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w kq - 0 1');
      expect(hasMove(position, 'e1', 'g1')).toBe(false);
      expect(hasMove(position, 'e1', 'c1')).toBe(false);
    });
  });
  
  describe('Promotion', () => {
    it('should generate promotion moves', () => {
      const position = parseFEN('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const moves = generateLegalMoves(position).filter(m => m.from === 'a7');
      // Should have 4 promotion options: Q, R, B, N
      expect(moves.length).toBe(4);
      expect(moves.every(m => m.promotion !== undefined)).toBe(true);
    });
  });
  
  describe('Check Detection', () => {
    it('should detect check', () => {
      const position = parseFEN('rnb1kbnr/pppp1ppp/4p3/8/7q/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 1');
      expect(isInCheck(position, position.sideToMove)).toBe(true);
    });
    
    it('should not falsely detect check', () => {
      const position = parseFEN(STARTING_FEN);
      expect(isInCheck(position, position.sideToMove)).toBe(false);
    });
    
    it('should not allow moves that leave king in check', () => {
      // King is pinned by queen - can't move e2 pawn
      const position = parseFEN('rnb1kbnr/pppp1ppp/8/4p2q/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
      expect(hasMove(position, 'f2', 'f3')).toBe(false);
    });
  });
  
  describe('Checkmate Detection', () => {
    it('should detect checkmate (fools mate)', () => {
      const position = parseFEN('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1');
      expect(isCheckmate(position)).toBe(true);
    });
    
    it('should not falsely detect checkmate', () => {
      const position = parseFEN(STARTING_FEN);
      expect(isCheckmate(position)).toBe(false);
    });
  });
  
  describe('Stalemate Detection', () => {
    it('should detect stalemate', () => {
      const position = parseFEN('k7/8/1K6/8/8/8/8/8 b - - 0 1');
      // King on a8 is not in check but has no legal moves
      const stalematePos = parseFEN('8/8/8/8/8/6k1/5q2/7K w - - 0 1');
      expect(isStalemate(stalematePos)).toBe(true);
    });
    
    it('should not falsely detect stalemate', () => {
      const position = parseFEN(STARTING_FEN);
      expect(isStalemate(position)).toBe(false);
    });
  });
});

describe('Perft Tests', () => {
  // These are well-known perft results for the starting position
  // They verify that our move generator is working correctly
  
  it('perft(1) should return 20', () => {
    const position = parseFEN(STARTING_FEN);
    expect(perft(position, 1)).toBe(20);
  });
  
  it('perft(2) should return 400', () => {
    const position = parseFEN(STARTING_FEN);
    expect(perft(position, 2)).toBe(400);
  });
  
  it('perft(3) should return 8902', () => {
    const position = parseFEN(STARTING_FEN);
    expect(perft(position, 3)).toBe(8902);
  });
  
  // perft(4) = 197,281 - this may be slow, so we'll skip for CI
  it.skip('perft(4) should return 197281', () => {
    const position = parseFEN(STARTING_FEN);
    expect(perft(position, 4)).toBe(197281);
  });
});

describe('Kiwipete Position Tests', () => {
  // Kiwipete is a famous position for testing move generators
  const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
  
  it('perft(1) should return 48', () => {
    const position = parseFEN(KIWIPETE);
    expect(perft(position, 1)).toBe(48);
  });
  
  it('perft(2) should return 2039', () => {
    const position = parseFEN(KIWIPETE);
    expect(perft(position, 2)).toBe(2039);
  });
});
