/**
 * Chess Master Pro - Test Setup
 * 
 * Jest configuration and global test utilities
 */

// Mock Web Workers for testing
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  postMessage(_data: unknown): void {
    // Mock implementation
  }
  
  terminate(): void {
    // Mock implementation
  }
}

// @ts-ignore
global.Worker = MockWorker;

// Increase timeout for slower tests
jest.setTimeout(10000);
