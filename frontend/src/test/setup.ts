import '@testing-library/jest-dom';

// Mock ResizeObserver (required by Radix UI components)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
