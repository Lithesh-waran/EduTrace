import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => undefined;
}

if (!window.Element.prototype.hasPointerCapture) {
  window.Element.prototype.hasPointerCapture = () => false;
  window.Element.prototype.releasePointerCapture = () => undefined;
  window.Element.prototype.setPointerCapture = () => undefined;
}

if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:mock';
  window.URL.revokeObjectURL = () => undefined;
}

afterEach(() => {
  cleanup();
});
