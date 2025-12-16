/**
 * Chess Master Pro - FEN Parser Tests
 * 
 * Tests for FEN (Forsyth-Edwards Notation) parsing and generation
 */

import { parseFEN, positionToFEN, STARTING_FEN, isValidFEN } from '../engine/board/fen';
import { Color, PieceType } from '../types';

describe('FEN Parser', () => {
  describe('Parsing', () => {
    it('should parse starting position correctly', () => {
      const position = parseFEN(STARTING_FEN);
      
      // Check side to move
      expect(position.sideToMove).toBe(Color.WHITE);
      
      // Check castling rights
      expect(position.castlingRights.whiteKingside).toBe(true);
      expect(position.castlingRights.whiteQueenside).toBe(true);
      expect(position.castlingRights.blackKingside).toBe(true);
      expect(position.castlingRights.blackQueenside).toBe(true);
      
      // Check en passant
      expect(position.enPassantSquare).toBeNull();
      
      // Check clocks
      expect(position.halfMoveClock).toBe(0);
      expect(position.fullMoveNumber).toBe(1);
      
      // Check specific pieces
      expect(position.board[0]).toEqual({ type: PieceType.ROOK, color: Color.WHITE });
      expect(position.board[4]).toEqual({ type: PieceType.KING, color: Color.WHITE });
      expect(position.board[60]).toEqual({ type: PieceType.KING, color: Color.BLACK });
    });
    
    it('should parse en passant square', () => {
      const fen = 'rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3';
      const position = parseFEN(fen);
      expect(position.enPassantSquare).toBe('e6');
    });
    
    it('should parse partial castling rights', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w Kq - 0 1';
      const position = parseFEN(fen);
      expect(position.castlingRights.whiteKingside).toBe(true);
      expect(position.castlingRights.whiteQueenside).toBe(false);
      expect(position.castlingRights.blackKingside).toBe(false);
      expect(position.castlingRights.blackQueenside).toBe(true);
    });
    
    it('should parse no castling rights', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w - - 0 1';
      const position = parseFEN(fen);
      expect(position.castlingRights.whiteKingside).toBe(false);
      expect(position.castlingRights.whiteQueenside).toBe(false);
      expect(position.castlingRights.blackKingside).toBe(false);
      expect(position.castlingRights.blackQueenside).toBe(false);
    });
    
    it('should parse black to move', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const position = parseFEN(fen);
      expect(position.sideToMove).toBe(Color.BLACK);
    });
    
    it('should parse half-move clock', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 25 50';
      const position = parseFEN(fen);
      expect(position.halfMoveClock).toBe(25);
      expect(position.fullMoveNumber).toBe(50);
    });
    
    it('should parse empty board', () => {
      const fen = '8/8/8/8/8/8/8/8 w - - 0 1';
      const position = parseFEN(fen);
      expect(position.board.every(sq => sq === null)).toBe(true);
    });
  });
  
  describe('Validation', () => {
    it('should accept valid FEN strings', () => {
      expect(isValidFEN(STARTING_FEN)).toBe(true);
      expect(isValidFEN('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')).toBe(true);
    });
    
    it('should reject invalid FEN strings', () => {
      expect(isValidFEN('')).toBe(false);
      expect(isValidFEN('invalid')).toBe(false);
      expect(isValidFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1')).toBe(false); // Missing rank
    });
  });
  
  describe('Generation', () => {
    it('should generate starting position FEN', () => {
      const position = parseFEN(STARTING_FEN);
      const fen = positionToFEN(position);
      expect(fen).toBe(STARTING_FEN);
    });
    
    it('should round-trip arbitrary FEN', () => {
      const originalFEN = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
      const position = parseFEN(originalFEN);
      const generatedFEN = positionToFEN(position);
      expect(generatedFEN).toBe(originalFEN);
    });
    
    it('should preserve en passant in FEN', () => {
      const originalFEN = 'rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3';
      const position = parseFEN(originalFEN);
      const generatedFEN = positionToFEN(position);
      expect(generatedFEN).toBe(originalFEN);
    });
    
    it('should preserve partial castling rights in FEN', () => {
      const originalFEN = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w Kq - 0 1';
      const position = parseFEN(originalFEN);
      const generatedFEN = positionToFEN(position);
      expect(generatedFEN).toBe(originalFEN);
    });
  });
});
