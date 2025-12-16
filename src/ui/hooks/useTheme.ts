/**
 * Chess Master Pro - Theme Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { Theme, BoardOrientation } from '../../types';
import { Theme as ThemeEnum, BoardOrientation as OrientationEnum } from '../../types';

interface UISettings {
  theme: Theme;
  boardOrientation: BoardOrientation;
  showLegalMoves: boolean;
  showLastMove: boolean;
  showCoordinates: boolean;
  animationSpeed: number;
}

const DEFAULT_SETTINGS: UISettings = {
  theme: ThemeEnum.DARK,
  boardOrientation: OrientationEnum.WHITE,
  showLegalMoves: true,
  showLastMove: true,
  showCoordinates: true,
  animationSpeed: 200,
};

const STORAGE_KEY = 'chess-master-pro-settings';

/**
 * Load settings from localStorage
 */
function loadSettings(): UISettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: UISettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Hook for UI settings management
 */
export function useUISettings() {
  const [settings, setSettings] = useState<UISettings>(loadSettings);
  
  // Apply theme on mount and changes
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);
  
  // Save settings on changes
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);
  
  const updateSettings = useCallback((updates: Partial<UISettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);
  
  const toggleTheme = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === ThemeEnum.DARK ? ThemeEnum.LIGHT : ThemeEnum.DARK,
    }));
  }, []);
  
  const flipBoard = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      boardOrientation: prev.boardOrientation === OrientationEnum.WHITE 
        ? OrientationEnum.BLACK 
        : OrientationEnum.WHITE,
    }));
  }, []);
  
  return {
    settings,
    updateSettings,
    toggleTheme,
    flipBoard,
  };
}
