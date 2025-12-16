/**
 * Chess Master Pro - Transposition Table
 * 
 * The transposition table stores previously evaluated positions to avoid
 * re-searching them. This provides significant performance improvements
 * as the same position can be reached through different move orders.
 */

import type { Move, TranspositionEntry, ZobristHash } from '../../types';

// ============================================================================
// TRANSPOSITION TABLE
// ============================================================================

/**
 * Transposition table implementation using a hash map
 */
export class TranspositionTable {
  private table: Map<string, TranspositionEntry>;
  private maxSize: number;
  private hits: number;
  private misses: number;
  private collisions: number;
  
  constructor(maxSizeMB: number = 64) {
    // Estimate ~100 bytes per entry
    this.maxSize = Math.floor((maxSizeMB * 1024 * 1024) / 100);
    this.table = new Map();
    this.hits = 0;
    this.misses = 0;
    this.collisions = 0;
  }
  
  /**
   * Convert BigInt hash to string key (for Map compatibility)
   */
  private hashToKey(hash: ZobristHash): string {
    return hash.toString(16);
  }
  
  /**
   * Store an entry in the transposition table
   */
  store(
    hash: ZobristHash,
    depth: number,
    evaluation: number,
    nodeType: 'exact' | 'lowerBound' | 'upperBound',
    bestMove: Move | null
  ): void {
    const key = this.hashToKey(hash);
    const existing = this.table.get(key);
    
    // Replacement strategy: always replace if new search is deeper
    if (existing !== undefined) {
      if (existing.depth > depth) {
        this.collisions++;
        return; // Don't replace deeper entries
      }
    }
    
    // Evict entries if table is full (simple FIFO-like eviction)
    if (this.table.size >= this.maxSize) {
      // Delete first 10% of entries
      const toDelete = Math.floor(this.maxSize * 0.1);
      const keys = this.table.keys();
      for (let i = 0; i < toDelete; i++) {
        const result = keys.next();
        if (!result.done) {
          this.table.delete(result.value);
        }
      }
    }
    
    this.table.set(key, {
      hash,
      depth,
      evaluation,
      nodeType,
      bestMove,
    });
  }
  
  /**
   * Probe the transposition table for an entry
   */
  probe(hash: ZobristHash): TranspositionEntry | null {
    const key = this.hashToKey(hash);
    const entry = this.table.get(key);
    
    if (entry === undefined) {
      this.misses++;
      return null;
    }
    
    // Verify hash matches (collision detection)
    if (entry.hash !== hash) {
      this.collisions++;
      return null;
    }
    
    this.hits++;
    return entry;
  }
  
  /**
   * Get best move from table if available
   */
  getBestMove(hash: ZobristHash): Move | null {
    const entry = this.probe(hash);
    return entry?.bestMove ?? null;
  }
  
  /**
   * Clear the table
   */
  clear(): void {
    this.table.clear();
    this.hits = 0;
    this.misses = 0;
    this.collisions = 0;
  }
  
  /**
   * Get statistics
   */
  getStats(): { size: number; hits: number; misses: number; collisions: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.table.size,
      hits: this.hits,
      misses: this.misses,
      collisions: this.collisions,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
  
  /**
   * Get the number of entries in the table
   */
  get size(): number {
    return this.table.size;
  }
}

// Global transposition table instance
export const transpositionTable = new TranspositionTable();
