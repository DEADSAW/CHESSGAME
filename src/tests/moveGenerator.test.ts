/**
 * Chess Master Pro - Move Generation Tests
 * 
 * Comprehensive tests for the move generator including:
 * - Basic piece movement
 * - Special moves (castling, en passant, promotion)
 * - Check and checkmate detection
 * - Perft (Performance Test) for move generation accuracy
 */

import { parseFen, STARTING_FEN } from '../engine/board/fen';
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
      const position = parseFen(STARTING_FEN);
      expect(countMoves(position)).toBe(20);
    });
    
    it('should allow e2-e4 pawn move', () => {
      const position = parseFen(STARTING_FEN);
      expect(hasMove(position, 'e2', 'e4')).toBe(true);
    });
    
    it('should allow Nf3 knight move', () => {
      const position = parseFen(STARTING_FEN);
      expect(hasMove(position, 'g1', 'f3')).toBe(true);
    });
    
    it('should not allow Bf1-a6 (blocked by pawn)', () => {
      const position = parseFen(STARTING_FEN);
      expect(hasMove(position, 'f1', 'a6')).toBe(false);
    });
  });
  
  describe('Pawn Movement', () => {
    it('should allow pawn to move forward one square', () => {
      const position = parseFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      expect(hasMove(position, 'e7', 'e6')).toBe(true);
    });
    
    it('should allow pawn double move from starting rank', () => {
      const position = parseFen(STARTING_FEN);
      expect(hasMove(position, 'e2', 'e4')).toBe(true);
    });
    
    it('should not allow pawn double move after moving', () => {
      const position = parseFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      expect(hasMove(position, 'e4', 'e6')).toBe(false);
    });
    
    it('should allow diagonal pawn capture', () => {
      const position = parseFen('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
      expect(hasMove(position, 'e4', 'd5')).toBe(true);
    });
    
    it('should not allow pawn to move forward onto occupied square', () => {
      const position = parseFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2');
      expect(hasMove(position, 'e4', 'e5')).toBe(false);
    });
  });
  
  describe('En Passant', () => {
    const position = parseFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      const position = parseFen('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 1');
      expect(hasMove(position, 'f5', 'e6')).toBe(true);
    });
    const position = parseFen(STARTING_FEN);
    it('should not allow en passant when not available', () => {
      const position = parseFen('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq - 0 1');
      expect(hasMove(position, 'f5', 'e6')).toBe(false);
    const position = parseFen('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
  });
  
  describe('Castling', () => {
    const position = parseFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2');
      const position = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      expect(hasMove(position, 'e1', 'g1')).toBe(true);
    });
    
    it('should allow queenside castling when legal', () => {
    const position = parseFen('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 1');
      expect(hasMove(position, 'e1', 'c1')).toBe(true);
    });
    
    const position = parseFen('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq - 0 1');
      const position = parseFen('r3k2r/pppp1ppp/8/4r3/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
      expect(hasMove(position, 'e1', 'g1')).toBe(false);
    });
    
    it('should not allow castling when king is in check', () => {
    const position = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      const positionInCheck = parseFen('r3k2r/pppp1ppp/8/8/4r3/8/PPPP1PPP/R3K2R w KQkq - 0 1');
      expect(isInCheck(positionInCheck, positionInCheck.sideToMove)).toBe(true);
      expect(hasMove(positionInCheck, 'e1', 'g1')).toBe(false);
    const position = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    
    it('should not allow castling when rights are lost', () => {
      const position = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w kq - 0 1');
    const position = parseFen('r3k2r/pppp1ppp/8/4r3/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
      expect(hasMove(position, 'e1', 'c1')).toBe(false);
    });
  });
    const position = parseFen('r3k2r/pppp1ppp/8/8/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
    const positionInCheck = parseFen('r3k2r/pppp1ppp/8/8/4r3/8/PPPP1PPP/R3K2R w KQkq - 0 1');
    it('should generate promotion moves', () => {
      const position = parseFen('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const moves = generateLegalMoves(position).filter(m => m.from === 'a7');
    const position = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w kq - 0 1');
      expect(moves.length).toBe(4);
      expect(moves.every(m => m.promotion !== undefined)).toBe(true);
    });
  });
  
    const position = parseFen('8/P7/8/8/8/8/8/4K2k w - - 0 1');
    it('should detect check', () => {
      const position = parseFen('rnb1kbnr/pppp1ppp/4p3/8/7q/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 1');
      expect(isInCheck(position, position.sideToMove)).toBe(true);
    });
    
    it('should not falsely detect check', () => {
      const position = parseFen(STARTING_FEN);
      expect(isInCheck(position, position.sideToMove)).toBe(false);
    });
    const position = parseFen('rnb1kbnr/pppp1ppp/4p3/8/7q/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 1');
    it('should not allow moves that leave king in check', () => {
      // King is pinned by queen - can't move e2 pawn
      const position = parseFen('rnb1kbnr/pppp1ppp/8/4p2q/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    const position = parseFen(STARTING_FEN);
    });
  });
  
  describe('Checkmate Detection', () => {
    const position = parseFen('rnb1kbnr/pppp1ppp/8/4p2q/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
      const position = parseFen('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1');
      expect(isCheckmate(position)).toBe(true);
    });
    
    it('should not falsely detect checkmate', () => {
      const position = parseFen(STARTING_FEN);
    const position = parseFen('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1');
    });
  });
  
    const position = parseFen(STARTING_FEN);
    it('should detect stalemate', () => {
      const position = parseFen('k7/8/1K6/8/8/8/8/8 b - - 0 1');
      // King on a8 is not in check but has no legal moves
      const stalematePos = parseFen('8/8/8/8/8/6k1/5q2/7K w - - 0 1');
      expect(isStalemate(stalematePos)).toBe(true);
    const position = parseFen('k7/8/1K6/8/8/8/8/8 b - - 0 1');
    
    const stalematePos = parseFen('8/8/8/8/8/6k1/5q2/7K w - - 0 1');
      const position = parseFen(STARTING_FEN);
      expect(isStalemate(position)).toBe(false);
    });
  });
    const position = parseFen(STARTING_FEN);

describe('Perft Tests', () => {
  // These are well-known perft results for the starting position
  // They verify that our move generator is working correctly
  
  it('perft(1) should return 20', () => {
    const position = parseFen(STARTING_FEN);
    expect(perft(position, 1)).toBe(20);
  });
  
   const position = parseFen(STARTING_FEN);
    const position = parseFen(STARTING_FEN);
    expect(perft(position, 2)).toBe(400);
  });
  
   const position = parseFen(STARTING_FEN);
    const position = parseFen(STARTING_FEN);
    expect(perft(position, 3)).toBe(8902);
  });
  
   const position = parseFen(STARTING_FEN);
  it.skip('perft(4) should return 197281', () => {
    const position = parseFen(STARTING_FEN);
    expect(perft(position, 4)).toBe(197281);
  });
});
   const position = parseFen(STARTING_FEN);
describe('Kiwipete Position Tests', () => {
  // Kiwipete is a famous position for testing move generators
  const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
  
  it('perft(1) should return 48', () => {
    const position = parseFen(KIWIPETE);
    expect(perft(position, 1)).toBe(48);
  });
  
  it('perft(2) should return 2039', () => {
    const position = parseFen(KIWIPETE);
    expect(perft(position, 2)).toBe(2039);
  });
});
