import { beforeEach, describe, it, expect, vi } from 'vitest';

describe("Logger Branch Coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("uses default 'info' level when LOG_LEVEL is missing", () => {
    delete process.env.LOG_LEVEL;
    const logger = require("../src/lib/logger");
    expect(logger.level).toBe("info");
  });

  it("configures transport for non-production", () => {
    process.env.NODE_ENV = "development";
    const logger = require("../src/lib/logger");
    expect(logger).toBeDefined();
  });
});