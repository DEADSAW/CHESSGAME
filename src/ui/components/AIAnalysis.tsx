/**
 * Chess Master Pro - AI Analysis Panel Component
 * 
 * Displays AI thinking information including evaluation, search depth,
 * principal variation, and nodes searched
 */

import React from 'react';
import type { SearchResult } from '../../types';
import { indexToNotation } from '../../engine/board/constants';
import './AIAnalysis.css';

interface AIAnalysisProps {
  searchResult: SearchResult | null;
  isThinking: boolean;
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({
  searchResult,
  isThinking,
}) => {
  // Format evaluation score for display
  const formatEval = (score: number): string => {
    // Check for mate scores
    const MATE_SCORE = 100000;
    if (Math.abs(score) > MATE_SCORE - 100) {
      const mateIn = Math.ceil((MATE_SCORE - Math.abs(score)) / 2);
      return score > 0 ? `M${mateIn}` : `-M${mateIn}`;
    }
    
    // Regular centipawn score
    const pawns = score / 100;
    const sign = pawns >= 0 ? '+' : '';
    return `${sign}${pawns.toFixed(2)}`;
  };
  
  // Format nodes count
  const formatNodes = (nodes: number): string => {
    if (nodes >= 1000000) {
      return `${(nodes / 1000000).toFixed(2)}M`;
    }
    if (nodes >= 1000) {
      return `${(nodes / 1000).toFixed(1)}k`;
    }
    return nodes.toString();
  };
  
  // Calculate eval bar width
  const getEvalBarWidth = (score: number): number => {
    // Clamp between -5 and +5 pawns for visual
    const pawns = Math.max(-5, Math.min(5, score / 100));
    return 50 + (pawns * 10); // 0% to 100%
  };
  
  if (!searchResult && !isThinking) {
    return (
      <div className="ai-analysis">
        <div className="ai-analysis-header">
          <h3>Engine Analysis</h3>
        </div>
        <div className="ai-analysis-empty">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <p>Play against the AI to see analysis</p>
        </div>
      </div>
    );
  }
  
  const score = searchResult?.evaluation ?? searchResult?.score ?? 0;
  const depth = searchResult?.depth ?? 0;
  const nodes = searchResult?.nodesSearched ?? searchResult?.nodes ?? 0;
  const pv = searchResult?.principalVariation ?? searchResult?.pv ?? [];
  const bestMove = searchResult?.bestMove 
    ? `${indexToNotation(searchResult.bestMove.from)}-${indexToNotation(searchResult.bestMove.to)}` 
    : '-';
  
  return (
    <div className="ai-analysis">
      <div className="ai-analysis-header">
        <h3>Engine Analysis</h3>
        {isThinking && <span className="thinking-badge">Thinking...</span>}
      </div>
      
      {/* Evaluation Bar */}
      <div className="eval-bar-container">
        <div className="eval-bar">
          <div 
            className="eval-bar-white" 
            style={{ width: `${getEvalBarWidth(score)}%` }}
          />
        </div>
        <div className="eval-score" data-advantage={score > 50 ? 'white' : score < -50 ? 'black' : 'equal'}>
          {formatEval(score)}
        </div>
      </div>
      
      {/* Stats */}
      <div className="ai-stats">
        <div className="stat">
          <span className="stat-label">Depth</span>
          <span className="stat-value">{depth}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Nodes</span>
          <span className="stat-value">{formatNodes(nodes)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Best Move</span>
          <span className="stat-value highlight">{bestMove}</span>
        </div>
      </div>
      
      {/* Principal Variation */}
      {pv.length > 0 && (
        <div className="pv-line">
          <span className="pv-label">Best line:</span>
          <span className="pv-moves">
            {pv.slice(0, 6).map((m, i) => `${indexToNotation(m.from)}-${indexToNotation(m.to)}`).join(' ')}
            {pv.length > 6 ? '...' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
