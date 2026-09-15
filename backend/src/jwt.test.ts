import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

import type { Request, Response } from "express";

process.env.JWT_SECRET_KEY = "jwt-test-secret";

const { generateToken, verifyToken } = await import("./jwt.js");

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

const createResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    body: undefined,
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(body) {
      response.body = body;
      return response;
    },
  };

  return response;
};

const createRequest = (
  cookies: Record<string, string> = {},
): Request => ({ cookies }) as unknown as Request;

test("verifyToken rejects a request without an authToken cookie", () => {
  const req = createRequest();
  const res = createResponse();
  let nextCalls = 0;

  verifyToken(req, res as unknown as Response, () => {
    nextCalls += 1;
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "認証トークンがありません。" });
  assert.equal(nextCalls, 0);
});

test("verifyToken accepts a valid token and stores its payload on the request", () => {
  const req = createRequest({
    authToken: generateToken({ id: 7, email: "test@example.com" }),
  });
  const res = createResponse();
  let nextCalls = 0;

  verifyToken(req, res as unknown as Response, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  const user = (req as Request & {
    user?: { id: number; email: string; iat?: number; exp?: number };
  }).user;
  assert.equal(user?.id, 7);
  assert.equal(user?.email, "test@example.com");
  assert.equal(typeof user?.iat, "number");
  assert.equal(typeof user?.exp, "number");
});

test("verifyToken returns 440 for an expired token", () => {
  const token = jwt.sign({ id: 7 }, "jwt-test-secret", { expiresIn: -1 });
  const req = createRequest({ authToken: token });
  const res = createResponse();
  let nextCalls = 0;

  verifyToken(req, res as unknown as Response, () => {
    nextCalls += 1;
  });

  assert.equal(res.statusCode, 440);
  assert.deepEqual(res.body, { error: "認証トークンが有効期限切れです。" });
  assert.equal(nextCalls, 0);
});

test("verifyToken returns 401 for an invalid token", () => {
  const req = createRequest({ authToken: "invalid-token" });
  const res = createResponse();
  let nextCalls = 0;

  verifyToken(req, res as unknown as Response, () => {
    nextCalls += 1;
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "認証トークンが無効です。" });
  assert.equal(nextCalls, 0);
});
