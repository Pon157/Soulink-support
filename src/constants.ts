export const THEMES = {
  TELEGRAM: {
    name: 'Telegram Classic',
    primary: '#2481cc',
    secondary: '#ffffff',
    bg: '#f4f4f5',
    text: '#000000',
    bubbleUser: '#effdde',
    bubbleOther: '#ffffff',
  },
  DARK: {
    name: 'Midnight',
    primary: '#64b5f6',
    secondary: '#1e1e1e',
    bg: '#0f0f0f',
    text: '#ffffff',
    bubbleUser: '#2b5278',
    bubbleOther: '#181818',
  },
  ARCTIC: {
    name: 'Arctic Frost',
    primary: '#00bcd4',
    secondary: '#e0f7fa',
    bg: '#ffffff',
    text: '#263238',
    bubbleUser: '#b2ebf2',
    bubbleOther: '#eceff1',
  },
  HIGH_DENSITY: {
    name: 'High Density',
    primary: '#3b82f6',
    secondary: '#1e293b',
    bg: '#0f172a',
    text: '#f1f5f9',
    bubbleUser: '#2b5278',
    bubbleOther: '#242f3d',
  }
} as const;

export type ThemeKey = keyof typeof THEMES;

export const APP_NAME = "SoulLink Support";
