import '@testing-library/jest-dom';

// Mock ResizeObserver (required by Radix UI components)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
