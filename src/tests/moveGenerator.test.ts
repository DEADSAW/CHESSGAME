/**
 * Chess Master Pro - Move Generation Tests
 *
 * Covers basic moves, special moves, check detection, and perft.
 */

import { parseFen, STARTING_FEN } from '../engine/board/fen';
import { notationToIndex } from '../engine/board/constants';
import { generateLegalMoves, isInCheck, isCheckmate, isStalemate } from '../engine/moves/generator';
import type { Position, SquareNotation } from '../types';

// Helpers
function countMoves(position: Position): number {
  return generateLegalMoves(position).length;
}

function hasMove(position: Position, from: SquareNotation, to: SquareNotation): boolean {
  const fromIdx = notationToIndex(from);
  const toIdx = notationToIndex(to);
  return generateLegalMoves(position).some(m => m.from === fromIdx && m.to === toIdx);
}

function perft(position: Position, depth: number): number {
  if (depth === 0) return 1;

  const moves = generateLegalMoves(position);
  if (depth === 1) return moves.length;

  let nodes = 0;
  for (const move of moves) {
    const { makeMove } = require('../engine/moves/generator');
    const newPosition = makeMove(position, move);
    nodes += perft(newPosition, depth - 1);
  }

  return nodes;
}

describe('Move Generator', () => {
  describe('Starting Position', () => {
    it('generates 20 legal moves', () => {
      const position = parseFen(STARTING_FEN);
      expect(countMoves(position)).toBe(20);
    });

    it('allows e2-e4 pawn move', () => {
      const position = parseFen(STARTING_FEN);
      expect(hasMove(position, 'e2', 'e4')).toBe(true);
    });

    it('allows Nf3 knight move', () => {
      const position = parseFen(STARTING_FEN);
      expect(hasMove(position, 'g1', 'f3')).toBe(true);
    });

    it('blocks Bf1-a6 (pawn blocks)', () => {
      const position = parseFen(STARTING_FEN);
      expect(hasMove(position, 'f1', 'a6')).toBe(false);
    });
  });

  describe('Pawn Movement', () => {
    it('moves forward one square', () => {
      const position = parseFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      expect(hasMove(position, 'e7', 'e6')).toBe(true);
    });

    it('allows pawn double move from start', () => {
      const position = parseFen(STARTING_FEN);
      expect(hasMove(position, 'e2', 'e4')).toBe(true);
    });

    it('disallows pawn double move after moving', () => {
      const position = parseFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      expect(hasMove(position, 'e4', 'e6')).toBe(false);
    });

    it('allows diagonal pawn capture', () => {
      const position = parseFen('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
      expect(hasMove(position, 'e4', 'd5')).toBe(true);
    });

    it('blocks forward move onto occupied square', () => {
      const position = parseFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2');
      expect(hasMove(position, 'e4', 'e5')).toBe(false);
    });
  });

  describe('En Passant', () => {
    it('allows en passant capture when available', () => {
      const position = parseFen('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 1');
      expect(hasMove(position, 'f5', 'e6')).toBe(true);
    });

    it('disallows en passant when not available', () => {
      const position = parseFen('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq - 0 1');
      expect(hasMove(position, 'f5', 'e6')).toBe(false);
    });
  });

  describe('Castling', () => {
    it('allows kingside castling when legal', () => {
      const position = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      expect(hasMove(position, 'e1', 'g1')).toBe(true);
    });

    it('allows queenside castling when legal', () => {
      const position = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      expect(hasMove(position, 'e1', 'c1')).toBe(true);
    });

    it('blocks castling through check', () => {
      const position = parseFen('r3k2r/pppp1ppp/8/4r3/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
      expect(hasMove(position, 'e1', 'g1')).toBe(false);
    });

    it('blocks castling while in check', () => {
      const position = parseFen('r3k2r/pppp1ppp/8/8/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
      const positionInCheck = parseFen('r3k2r/pppp1ppp/8/8/4r3/8/PPPP1PPP/R3K2R w KQkq - 0 1');
      expect(isInCheck(positionInCheck.board, positionInCheck.sideToMove)).toBe(true);
      expect(hasMove(positionInCheck, 'e1', 'g1')).toBe(false);
    });

    it('blocks castling when rights are lost', () => {
      const position = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w kq - 0 1');
      expect(hasMove(position, 'e1', 'g1')).toBe(false);
      expect(hasMove(position, 'e1', 'c1')).toBe(false);
    });
  });

  describe('Promotion', () => {
    it('generates promotion moves', () => {
      const position = parseFen('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const fromA7 = notationToIndex('a7');
      const moves = generateLegalMoves(position).filter(m => m.from === fromA7);
      expect(moves.length).toBe(4);
      expect(moves.every(m => m.promotion !== undefined)).toBe(true);
    });
  });

  describe('Check Detection', () => {
    it('detects check', () => {
      const position = parseFen('rnb1kbnr/pppp1ppp/4p3/8/7q/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 1');
      expect(isInCheck(position.board, position.sideToMove)).toBe(true);
    });

    it('does not falsely detect check', () => {
      const position = parseFen(STARTING_FEN);
      expect(isInCheck(position.board, position.sideToMove)).toBe(false);
    });

    it('disallows moves leaving king in check', () => {
      const position = parseFen('rnb1kbnr/pppp1ppp/8/4p2q/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
      expect(hasMove(position, 'f2', 'f3')).toBe(false);
    });
  });

  describe('Checkmate Detection', () => {
    it('detects fools mate checkmate', () => {
      const position = parseFen('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1');
      expect(isCheckmate(position)).toBe(true);
    });

    it('does not falsely detect checkmate', () => {
      const position = parseFen(STARTING_FEN);
      expect(isCheckmate(position)).toBe(false);
    });
  });

  describe('Stalemate Detection', () => {
    it('detects stalemate', () => {
      const stalematePos = parseFen('8/8/8/8/8/6k1/5q2/7K w - - 0 1');
      expect(isStalemate(stalematePos)).toBe(true);
    });

    it('does not falsely detect stalemate', () => {
      const position = parseFen(STARTING_FEN);
      expect(isStalemate(position)).toBe(false);
    });
  });
});

describe('Perft Tests', () => {
  it('perft(1) returns 20', () => {
    const position = parseFen(STARTING_FEN);
    expect(perft(position, 1)).toBe(20);
  });

  it('perft(2) returns 400', () => {
    const position = parseFen(STARTING_FEN);
    expect(perft(position, 2)).toBe(400);
  });

  it('perft(3) returns 8902', () => {
    const position = parseFen(STARTING_FEN);
    expect(perft(position, 3)).toBe(8902);
  });

  it.skip('perft(4) returns 197281', () => {
    const position = parseFen(STARTING_FEN);
    expect(perft(position, 4)).toBe(197281);
  });
});

describe('Kiwipete Position Tests', () => {
  const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';

  it('perft(1) returns 48', () => {
    const position = parseFen(KIWIPETE);
    expect(perft(position, 1)).toBe(48);
  });

  it('perft(2) returns 2039', () => {
    const position = parseFen(KIWIPETE);
    expect(perft(position, 2)).toBe(2039);
  });
});
