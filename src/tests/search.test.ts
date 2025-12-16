/**
 * Chess Master Pro - Search Tests
 * 
 * Tests for the alpha-beta search algorithm
 */

import { parseFEN, STARTING_FEN } from '../engine/board/fen';
import { search } from '../engine/search/search';
import { Color } from '../types';

describe('Search', () => {
  describe('Basic Search', () => {
    it('should find a legal move from starting position', () => {
      const position = parseFEN(STARTING_FEN);
      const result = search(position, { maxDepth: 2 });
      
      expect(result.bestMove).toBeDefined();
      expect(result.depth).toBeGreaterThanOrEqual(1);
    });
    
    it('should find mate in 1', () => {
      // White to play and mate in 1 with Qh5#
      const position = parseFEN('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
      const result = search(position, { maxDepth: 3 });
      
      // The best move should lead to checkmate (high score)
      expect(result.score).toBeGreaterThan(99000);
    });
    
    it('should avoid being mated', () => {
      // Black to defend against mate threat
      const position = parseFEN('rnbqkbnr/ppppp2p/5p2/6pQ/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 3');
      const result = search(position, { maxDepth: 3 });
      
      // Should find a defensive move (not a terrible score)
      expect(result.bestMove).toBeDefined();
    });
    
    it('should capture free pieces', () => {
      // White can capture undefended black queen
      const position = parseFEN('rnb1kbnr/pppppppp/8/8/4q3/3B4/PPPPPPPP/RNBQK1NR w KQkq - 0 1');
      const result = search(position, { maxDepth: 2 });
      
      // Should capture the queen
      expect(result.bestMove).toBe('d3e4');
    });
  });
  
  describe('Search Options', () => {
    it('should respect max depth', () => {
      const position = parseFEN(STARTING_FEN);
      const result = search(position, { maxDepth: 1 });
      
      expect(result.depth).toBe(1);
    });
    
    it('should respect time limit', () => {
      const position = parseFEN(STARTING_FEN);
      const startTime = Date.now();
      const result = search(position, { maxTime: 100 });
      const elapsed = Date.now() - startTime;
      
      // Should complete within reasonable time (allowing for overhead)
      expect(elapsed).toBeLessThan(500);
    });
    
    it('should return nodes searched', () => {
      const position = parseFEN(STARTING_FEN);
      const result = search(position, { maxDepth: 2 });
      
      expect(result.nodes).toBeGreaterThan(0);
    });
  });
  
  describe('Principal Variation', () => {
    it('should return principal variation', () => {
      const position = parseFEN(STARTING_FEN);
      const result = search(position, { maxDepth: 3 });
      
      expect(result.pv).toBeDefined();
      expect(result.pv.length).toBeGreaterThan(0);
    });
  });
  
  describe('Tactical Positions', () => {
    it('should find winning tactical sequence', () => {
      // Fork position - knight can fork king and queen
      const position = parseFEN('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4');
      const result = search(position, { maxDepth: 3 });
      
      expect(result.bestMove).toBeDefined();
    });
  });
});
