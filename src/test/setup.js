import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement object URLs nor navigation on <a download> clicks.
window.URL.createObjectURL = vi.fn(() => "blob:mock");
window.URL.revokeObjectURL = vi.fn();
HTMLAnchorElement.prototype.click = vi.fn();

// Tests never hit the real API; a test that needs fetch stubs it explicitly.
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("fetch is not mocked in this test"))));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
