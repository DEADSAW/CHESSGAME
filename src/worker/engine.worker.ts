/**
 * Chess Master Pro - Web Worker Entry Point
 * 
 * This worker runs the chess engine in a separate thread to prevent
 * blocking the main UI thread during search operations.
 */

import type { 
  WorkerInMessage, 
  WorkerOutMessage, 
  Position,
  SearchOptions 
} from '../types';
import { 
  parseFenSafe, 
  createStartingPosition,
  calculateAiMove,
} from '../engine';

// ============================================================================
// WORKER STATE
// ============================================================================

let currentPosition: Position = createStartingPosition();
let isSearching = false;
let shouldStop = false;

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

/**
 * Send a message back to the main thread
 */
function postMessage(message: WorkerOutMessage): void {
  self.postMessage(message);
}

/**
 * Handle incoming messages from the main thread
 */
function handleMessage(message: WorkerInMessage): void {
  switch (message.type) {
    case 'init':
      handleInit();
      break;
      
    case 'setPosition':
      handleSetPosition(message.fen);
      break;
      
    case 'search':
      handleSearch(message.options);
      break;
      
    case 'stop':
      handleStop();
      break;
      
    case 'debug':
      handleDebug(message.command);
      break;
  }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

/**
 * Initialize the engine
 */
function handleInit(): void {
  currentPosition = createStartingPosition();
  isSearching = false;
  shouldStop = false;
  
  postMessage({ type: 'init', success: true });
}

/**
 * Set the current position from FEN
 */
function handleSetPosition(fen: string): void {
  try {
    currentPosition = parseFenSafe(fen);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    postMessage({ type: 'error', message: `Failed to parse FEN: ${errorMessage}` });
  }
}

/**
 * Start a search on the current position
 */
function handleSearch(options: SearchOptions): void {
  if (isSearching) {
    postMessage({ type: 'error', message: 'Search already in progress' });
    return;
  }
  
  isSearching = true;
  shouldStop = false;
  
  try {
    // Run the AI calculation
    const result = calculateAiMove(
      currentPosition,
      options.difficulty,
      options.playStyle
    );
    
    if (!shouldStop) {
      postMessage({ type: 'result', result });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    postMessage({ type: 'error', message: `Search error: ${errorMessage}` });
  } finally {
    isSearching = false;
  }
}

/**
 * Stop the current search
 */
function handleStop(): void {
  shouldStop = true;
}

/**
 * Handle debug commands
 */
function handleDebug(command: string): void {
  switch (command) {
    case 'position':
      postMessage({ type: 'debug', data: currentPosition });
      break;
      
    case 'status':
      postMessage({ 
        type: 'debug', 
        data: { 
          isSearching, 
          shouldStop,
          position: 'loaded' 
        } 
      });
      break;
      
    default:
      postMessage({ type: 'debug', data: `Unknown command: ${command}` });
  }
}

// ============================================================================
// WORKER SETUP
// ============================================================================

// Listen for messages from main thread
self.addEventListener('message', (event: MessageEvent<WorkerInMessage>) => {
  handleMessage(event.data);
});

// Signal that worker is ready
postMessage({ type: 'init', success: true });
