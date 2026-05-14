const { resetDb, registerAndLogin, request, app, prisma, createQuiz } = require("./helpers");
const path = require('path');
const fs = require('fs');

beforeEach(resetDb);

describe("Auth API coverage", () => {
 
  
  it("fails registration if fields are missing (Line 16)", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "test@test.com" });
    expect(res.status).toBe(400); // ValidationError
  });

  it("fails registration if email exists (Line 23)", async () => {
    await request(app).post("/api/auth/register").send({ email: "dup@test.com", password: "123", name: "A" });
    const res = await request(app).post("/api/auth/register").send({ email: "dup@test.com", password: "123", name: "A" });
    expect(res.status).toBe(409); // ConflictError
  });

  it("fails login if fields are missing (Line 49)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "test@test.com" });
    expect(res.status).toBe(400);
  });

  it("fails login with unknown email (Line 58)", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/auth/login").send({ email: "ghost@test.com", password: "123" });
    expect(res.status).toBe(401); // Unauthorized
  });

  it("covers invalid token error in auth middleware (Lines 19-20)", async () => {
    const res = await request(app)
      .get("/api/questions")
      .set("Authorization", "Bearer invalid.token.value"); 

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired token");
  });



  it("fails login with wrong password (Line 65)", async () => {
    await request(app).post("/api/auth/register").send({ email: "user@test.com", password: "correct", name: "A" });
    const res = await request(app).post("/api/auth/login").send({ email: "user@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });
});


