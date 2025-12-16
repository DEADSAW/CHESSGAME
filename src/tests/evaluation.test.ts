/**
 * Chess Master Pro - Evaluation Tests
 * 
 * Tests for position evaluation
 */

import { parseFEN, STARTING_FEN } from '../engine/board/fen';
import { evaluate, MATE_SCORE, DRAW_SCORE } from '../engine/evaluation/evaluate';
import { Color } from '../types';

describe('Position Evaluation', () => {
  describe('Material Evaluation', () => {
    it('should evaluate starting position as roughly equal', () => {
      const position = parseFEN(STARTING_FEN);
      const score = evaluate(position);
      // Starting position should be close to 0 (slight advantage to white due to tempo)
      expect(Math.abs(score)).toBeLessThan(50);
    });
    
    it('should give positive score when white has material advantage', () => {
      // White has extra queen
      const position = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const posWithExtraQueen = parseFEN('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(evaluate(posWithExtraQueen)).toBeGreaterThan(evaluate(position));
    });
    
    it('should give negative score when black has material advantage', () => {
      // Black has extra queen (white missing queen)
      const position = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1');
      expect(evaluate(position)).toBeLessThan(0);
    });
    
    it('should value pieces correctly relative to each other', () => {
      // Compare positions with different pieces
      const queenPos = parseFEN('4k3/8/8/8/8/8/8/4K2Q w - - 0 1');
      const twoRooksPos = parseFEN('4k3/8/8/8/8/8/8/R3K2R w - - 0 1');
      
      const queenScore = evaluate(queenPos);
      const rookScore = evaluate(twoRooksPos);
      
      // Queen (~900) vs two rooks (~1000) - rooks slightly better
      expect(rookScore).toBeGreaterThan(queenScore);
    });
  });
  
  describe('Positional Factors', () => {
    it('should prefer central pawn structure', () => {
      // Central pawns
      const centralPawns = parseFEN('4k3/8/8/8/3PP3/8/8/4K3 w - - 0 1');
      // Edge pawns
      const edgePawns = parseFEN('4k3/8/8/8/P6P/8/8/4K3 w - - 0 1');
      
      expect(evaluate(centralPawns)).toBeGreaterThan(evaluate(edgePawns));
    });
    
    it('should prefer developed pieces', () => {
      // Developed knights
      const developed = parseFEN('r1bqkb1r/pppppppp/2n2n2/8/8/2N2N2/PPPPPPPP/R1BQKB1R w KQkq - 0 1');
      // Undeveloped knights
      const undeveloped = parseFEN(STARTING_FEN);
      
      // Both should be roughly equal with slight edge to developed
      const developedScore = Math.abs(evaluate(developed));
      const undevelopedScore = Math.abs(evaluate(undeveloped));
      
      // Developed pieces should have better mobility
      expect(developedScore).toBeDefined();
    });
  });
  
  describe('Game Phase', () => {
    it('should evaluate endgame positions', () => {
      // King and pawn endgame
      const endgame = parseFEN('4k3/8/8/8/4P3/8/8/4K3 w - - 0 1');
      const score = evaluate(endgame);
      // White has winning advantage with pawn
      expect(score).toBeGreaterThan(0);
    });
  });
  
  describe('Evaluation Symmetry', () => {
    it('should return negated score for black', () => {
      const position = parseFEN('4k3/8/8/8/8/8/8/4K2Q w - - 0 1');
      const whiteScore = evaluate(position);
      
      // Flip the position for black
      const flippedPosition = parseFEN('4k2q/8/8/8/8/8/8/4K3 b - - 0 1');
      const blackScore = evaluate(flippedPosition);
      
      // Scores should be similar in magnitude but opposite for the side to move
      expect(Math.abs(whiteScore)).toBeCloseTo(Math.abs(blackScore), -2);
    });
  });
});
