/**
 * Chess Master Pro - Application Entry Point
 * 
 * Bootstraps the React application
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a <div id="root"></div> in your HTML.');
}

// Create React root and render
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
