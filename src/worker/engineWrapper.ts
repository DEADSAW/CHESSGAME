/**
 * Chess Master Pro - Engine Worker Wrapper
 * 
 * This module provides a clean API for communicating with the chess engine
 * running in a Web Worker. It handles message passing, timeouts, and errors.
 */

import type { 
  WorkerInMessage, 
  WorkerOutMessage, 
  SearchResult, 
  SearchOptions,
  Difficulty,
  PlayStyle,
} from '../types';
import { Difficulty as DifficultyEnum, PlayStyle as PlayStyleEnum } from '../types';

// ============================================================================
// TYPES
// ============================================================================

type MessageHandler = (message: WorkerOutMessage) => void;
type ErrorHandler = (error: Error) => void;
type ProgressHandler = (depth: number, nodes: number, evaluation: number) => void;

interface PendingSearch {
  resolve: (result: SearchResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout> | null;
}

// ============================================================================
// ENGINE WORKER CLASS
// ============================================================================

/**
 * Wrapper class for the chess engine Web Worker
 */
export class EngineWorker {
  private worker: Worker | null = null;
  private pendingSearch: PendingSearch | null = null;
  private onProgress: ProgressHandler | null = null;
  private onError: ErrorHandler | null = null;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  
  constructor() {
    this.initWorker();
  }
  
  /**
   * Initialize the Web Worker
   */
  private initWorker(): void {
    // Create worker from the engine worker module
    this.worker = new Worker(
      new URL('./engine.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    // Set up message handler
    this.worker.addEventListener('message', (event: MessageEvent<WorkerOutMessage>) => {
      this.handleMessage(event.data);
    });
    
    // Set up error handler
    this.worker.addEventListener('error', (event: ErrorEvent) => {
      this.handleWorkerError(new Error(event.message));
    });
    
    // Create ready promise
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
  }
  
  /**
   * Handle messages from the worker
   */
  private handleMessage(message: WorkerOutMessage): void {
    switch (message.type) {
      case 'init':
        this.isReady = message.success;
        if (this.readyResolve) {
          this.readyResolve();
          this.readyResolve = null;
        }
        break;
        
      case 'result':
        if (this.pendingSearch) {
          if (this.pendingSearch.timeout) {
            clearTimeout(this.pendingSearch.timeout);
          }
          this.pendingSearch.resolve(message.result);
          this.pendingSearch = null;
        }
        break;
        
      case 'progress':
        if (this.onProgress) {
          this.onProgress(message.depth, message.nodes, message.evaluation);
        }
        break;
        
      case 'error':
        this.handleWorkerError(new Error(message.message));
        break;
        
      case 'debug':
        // Debug messages - log to console
        break;
    }
  }
  
  /**
   * Handle worker errors
   */
  private handleWorkerError(error: Error): void {
    if (this.pendingSearch) {
      this.pendingSearch.reject(error);
      this.pendingSearch = null;
    }
    
    if (this.onError) {
      this.onError(error);
    }
  }
  
  /**
   * Send a message to the worker
   */
  private postMessage(message: WorkerInMessage): void {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    this.worker.postMessage(message);
  }
  
  /**
   * Wait for the worker to be ready
   */
  async waitForReady(): Promise<void> {
    if (this.isReady) return;
    if (this.readyPromise) {
      await this.readyPromise;
    }
  }
  
  /**
   * Set the current position
   */
  setPosition(fen: string): void {
    this.postMessage({ type: 'setPosition', fen });
  }
  
  /**
   * Search for the best move
   */
  async search(options: Partial<SearchOptions> = {}): Promise<SearchResult> {
    await this.waitForReady();
    
    // Cancel any pending search
    if (this.pendingSearch) {
      this.stop();
    }
    
    const defaultOptions: SearchOptions = {
      maxDepth: 5,
      maxTimeMs: 3000,
      difficulty: DifficultyEnum.MEDIUM,
      playStyle: PlayStyleEnum.BALANCED,
      mistakeProbability: 0,
    };
    
    const searchOptions: SearchOptions = { ...defaultOptions, ...options };
    
    return new Promise<SearchResult>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.stop();
        reject(new Error('Search timeout'));
      }, searchOptions.maxTimeMs + 5000); // Extra buffer for safety
      
      this.pendingSearch = { resolve, reject, timeout };
      this.postMessage({ type: 'search', options: searchOptions });
    });
  }
  
  /**
   * Stop the current search
   */
  stop(): void {
    this.postMessage({ type: 'stop' });
    
    if (this.pendingSearch) {
      if (this.pendingSearch.timeout) {
        clearTimeout(this.pendingSearch.timeout);
      }
      this.pendingSearch = null;
    }
  }
  
  /**
   * Set progress handler
   */
  setProgressHandler(handler: ProgressHandler | null): void {
    this.onProgress = handler;
  }
  
  /**
   * Set error handler
   */
  setErrorHandler(handler: ErrorHandler | null): void {
    this.onError = handler;
  }
  
  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.pendingSearch = null;
  }
  
  /**
   * Check if worker is ready
   */
  get ready(): boolean {
    return this.isReady;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let engineWorkerInstance: EngineWorker | null = null;

/**
 * Get the global engine worker instance
 */
export function getEngineWorker(): EngineWorker {
  if (!engineWorkerInstance) {
    engineWorkerInstance = new EngineWorker();
  }
  return engineWorkerInstance;
}

/**
 * Terminate and reset the global engine worker
 */
export function resetEngineWorker(): void {
  if (engineWorkerInstance) {
    engineWorkerInstance.terminate();
    engineWorkerInstance = null;
  }
}
