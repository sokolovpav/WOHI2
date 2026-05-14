const errorHandler = require("../src/middleware/errorHandler");
const { ZodError } = require("zod");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { AppError } = require("../src/lib/errors");

describe("errorHandler middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      log: {
        error: vi.fn(),
      },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    next = vi.fn();
  });

  it("handles ZodError", () => {
    const err = new ZodError([]);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid input",
      issues: [],
    });
  });

  it("handles MulterError", () => {
    const err = new multer.MulterError("LIMIT_FILE_SIZE");

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: err.message,
    });
  });

  it("handles JsonWebTokenError", () => {
    const err = new jwt.JsonWebTokenError("invalid token");

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid token",
    });
  });

  it("handles TokenExpiredError", () => {
    const err = new jwt.TokenExpiredError(
      "jwt expired",
      new Date()
    );

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid token",
    });
  });

it("handles AppError", () => {
  const err = new AppError("Forbidden", 403);

  errorHandler(err, req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);

  expect(res.json).toHaveBeenCalledWith({
    message: "Forbidden",
  });
});

  it("handles invalid JSON body", () => {
    const err = {
      type: "entity.parse.failed",
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid JSON in request body",
    });
  });

  it("handles unknown errors with 500", () => {
    const err = new Error("Unexpected");

    errorHandler(err, req, res, next);

    expect(req.log.error).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Internal server error",
    });
  });

  it("does not crash if req.log is missing", () => {
    req = {};

    const err = new Error("boom");

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Internal server error",
    });
  });
});