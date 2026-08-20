import { describe, it, expect, beforeEach } from "vitest";
import { app, registerAndLogin } from "./helpers";
import { resetDatabase } from "./setup";
import request from "supertest";

describe("Authentication", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("registers a new user and returns a sanitized user object", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Jane Owner",
      email: "jane@example.com",
      password: "Password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "jane@example.com", fullName: "Jane Owner" });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("rejects registration with a weak password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Jane Owner",
      email: "jane2@example.com",
      password: "weak",
    });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email registration", async () => {
    await request(app).post("/api/auth/register").send({ fullName: "A", email: "dupe@example.com", password: "Password123" });
    const res = await request(app).post("/api/auth/register").send({ fullName: "B", email: "dupe@example.com", password: "Password123" });
    expect(res.status).toBe(409);
  });

  it("logs in with correct credentials", async () => {
    await request(app).post("/api/auth/register").send({ fullName: "Login User", email: "login@example.com", password: "Password123" });
    const res = await request(app).post("/api/auth/login").send({ email: "login@example.com", password: "Password123" });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects login with an invalid password", async () => {
    await request(app).post("/api/auth/register").send({ fullName: "Login User", email: "login2@example.com", password: "Password123" });
    const res = await request(app).post("/api/auth/login").send({ email: "login2@example.com", password: "WrongPass1" });
    expect(res.status).toBe(401);
  });

  it("rejects login for a nonexistent user without leaking whether the account exists", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "Password123" });
    expect(res.status).toBe(401);
  });

  it("returns the current user from /me when authenticated", async () => {
    const { agent, user } = await registerAndLogin({ email: "me@example.com" });
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it("rejects /me without a session", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("logs out and invalidates the session", async () => {
    const { agent } = await registerAndLogin({ email: "logout@example.com" });
    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).toBe(204);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(401);
  });

  it("issues a reset token via forgot-password without revealing account existence", async () => {
    await request(app).post("/api/auth/register").send({ fullName: "Reset User", email: "reset@example.com", password: "Password123" });

    const known = await request(app).post("/api/auth/forgot-password").send({ email: "reset@example.com" });
    const unknown = await request(app).post("/api/auth/forgot-password").send({ email: "ghost@example.com" });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(known.body.devToken).toBeDefined();
    expect(unknown.body.devToken).toBeUndefined();
  });

  it("resets the password with a valid token and allows login with the new password", async () => {
    await request(app).post("/api/auth/register").send({ fullName: "Reset User 2", email: "reset2@example.com", password: "Password123" });
    const forgot = await request(app).post("/api/auth/forgot-password").send({ email: "reset2@example.com" });
    const token = forgot.body.devToken as string;

    const resetRes = await request(app).post("/api/auth/reset-password").send({ token, password: "NewPassword123" });
    expect(resetRes.status).toBe(200);

    const loginOld = await request(app).post("/api/auth/login").send({ email: "reset2@example.com", password: "Password123" });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app).post("/api/auth/login").send({ email: "reset2@example.com", password: "NewPassword123" });
    expect(loginNew.status).toBe(200);
  });
});
