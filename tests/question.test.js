const { resetDb, registerAndLogin, request, app, prisma, createQuiz } = require("./helpers");
const path = require('path');
const fs = require('fs');

beforeEach(resetDb);

describe("question tests", () => {
it("returns 401 without a token", async () => {
  const res = await request(app).get("/api/questions");
  expect(res.status).toBe(401);
});

it("returns 404 for unknown question", async () => {
  const token = await registerAndLogin();
  const res = await request(app).get("/api/questions/99999")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(404);
  expect(res.body.message).toBe("Question not found");
});

it("returns 400 for invalid post body", async () => {
  const token = await registerAndLogin();
  const res = await request(app).post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "" });
  expect(res.status).toBe(400);
});
});

describe("Questions API Comprehensive Tests", () => {
  let token;
  let userId;

  beforeEach(async () => {
    await resetDb(); 
    token = await registerAndLogin("me@test.com", "Me");
    // Get user id
    const user = await prisma.user.findUnique({ where: { email: "me@test.com" } });
    userId = user.id;
  });

  describe("GET /api/questions", () => {
    it("covers pagination and keyword filtering", async () => {
      
      await createQuiz(token, { question: "JS?", keywords: "coding,js" });
      await createQuiz(token, { question: "Python?", keywords: ["coding", "py"] });

      
      const resFilter = await request(app)
        .get("/api/questions?page=1&limit=10&keyword=js")
        .set("Authorization", `Bearer ${token}`);
      expect(resFilter.body.data).toHaveLength(1);

      
      const resPage = await request(app)
        .get("/api/questions?page=2&limit=1")
        .set("Authorization", `Bearer ${token}`);
      expect(resPage.body.page).toBe(2);
    });
  });

  describe("GET /api/questions/:id", () => {
    it("returns 404 for non-existent numeric ID", async () => {
      const res = await request(app)
        .get("/api/questions/999")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/questions", () => {
    it("handles keywords as an array and a string", async () => {
      
      const res1 = await request(app)
        .post("/api/questions")
        .set("Authorization", `Bearer ${token}`)
        .send({ question: "Q1", answer: "A1", keywords: ["tag1", "tag2"] });
      expect(res1.status).toBe(201);

      
      const res2 = await request(app)
        .post("/api/questions")
        .set("Authorization", `Bearer ${token}`)
        .send({ question: "Q2", answer: "A2", keywords: "tag3, tag4" });
      expect(res2.body.keywords).toContain("tag3");
    });
  
  });

  describe("PUT & DELETE (isOwner middleware)", () => {
    let otherToken, myQuest, otherQuest;

    beforeEach(async () => {
      myQuest = await createQuiz(token, { question: "My Question", answer: "Mine" });
      
      otherToken = await registerAndLogin("other@test.com", "Other");
      otherQuest = await createQuiz(otherToken, { question: "Other Question", answer: "Theirs" });
    });

    it("allows owner to update their question", async () => {
      const res = await request(app)
        .put(`/api/questions/${myQuest.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ question: "Updated", answer: "Updated", keywords: [] });
      expect(res.status).toBe(201);
    });

    it("forbids non-owner from updating (ForbiddenError)", async () => {
      const res = await request(app)
        .put(`/api/questions/${otherQuest.id}`)
        .set("Authorization", `Bearer ${token}`) 
        .send({ question: "Hack", answer: "Hack" });
      
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You can only modify your own question");
    });

    it("returns 404 in isOwner if question doesn't exist", async () => {
      const res = await request(app)
        .delete("/api/questions/8888")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("successfully deletes own question", async () => {
      const res = await request(app)
        .delete(`/api/questions/${myQuest.id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it("covers DELETE route question existence check", async () => {
  const isOwner = require("../src/middleware/isOwner");

  const original = isOwner;

  require.cache[require.resolve("../src/middleware/isOwner")].exports =
    (req, res, next) => next();

  const res = await request(app)
    .delete("/api/questions/999999")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(404);

  require.cache[require.resolve("../src/middleware/isOwner")].exports =
    original;
});
  });

  describe("POST /api/questions/:id/play", () => {
    it("handles correct/incorrect answers and double solving", async () => {
      const q = await createQuiz(token, { question: "2+2", answer: "4" });

      const resWrong = await request(app)
        .post(`/api/questions/${q.id}/play`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "5" });
      expect(resWrong.body.correct).toBe(false);

      const resRight = await request(app)
        .post(`/api/questions/${q.id}/play`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "  4  " });
      expect(resRight.body.correct).toBe(true);

      const resAgain = await request(app)
        .post(`/api/questions/${q.id}/play`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "4" });
      expect(resAgain.status).toBe(200);
    });

    it("throws ValidationError for empty answer", async () => {
      const q = await createQuiz(token, { question: "Q", answer: "A" });
      const res = await request(app)
        .post(`/api/questions/${q.id}/play`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "" });
      expect(res.status).toBe(400);
    });
  });

  describe("isOwner middleware coverage", () => {
    it("returns 403 when trying to delete someone else's question", async () => {
      
      const otherToken = await registerAndLogin("other@test.io", "Other");
      const otherQuest = await createQuiz(otherToken, { question: "Other Q", answer: "A" });

      
      const res = await request(app)
        .delete(`/api/questions/${otherQuest.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      const errorMsg = res.body.message || res.body.msg;
      expect(errorMsg).toBe("You can only modify your own question");
    });
    
  });
});


describe("Final Coverage Boost", () => {
  let token, userId, myQuest;

  beforeEach(async () => {
    token = await registerAndLogin("final@test.com", "Final");
    const user = await prisma.user.findUnique({ where: { email: "final@test.com" } });
    userId = user.id;
    
    myQuest = await createQuiz(token, { question: "Q", answer: "A" });
  });

  
  it("formats question even if user data is missing in the object", async () => {
    const res = await request(app)
      .get("/api/questions?page=1")
      .set("Authorization", `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('userName');
    }
  });

  
  it("covers detailed question view with attempts", async () => {
    
    await request(app)
      .post(`/api/questions/${myQuest.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "A" });

    const res = await request(app)
      .get(`/api/questions/${myQuest.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('correctAttemptsCount');
    expect(res.body).toHaveProperty('lastAttempts');
  });

  // 237
  it("retains existing imageUrl in PUT when no new file is uploaded", async () => {
    
    await prisma.question.update({
      where: { id: myQuest.id },
      data: { imageUrl: "existing-image.jpg" }
    });

    const res = await request(app)
      .put(`/api/questions/${myQuest.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        question: "Updated Question",
        answer: "Updated Answer",
        keywords: ["tag"]
      });

    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toBe("existing-image.jpg");
  });

  // 295: Play 
  it("returns 404 for play on non-existent id", async () => {
    const res = await request(app)
      .post("/api/questions/999999/play")
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "test" });
    expect(res.status).toBe(404);
  });

  it("handles invalid file type", async () => {
  const badFile = path.join(__dirname, "test.txt");

  fs.writeFileSync(badFile, "not image");

  const res = await request(app)
    .post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .attach("image", badFile)
    .field("question", "Q")
    .field("answer", "A");

  expect(res.status).toBe(400);

  const errorMsg = res.body.msg || res.body.message;

  expect(errorMsg).toBe("Only image files are allowed");

  fs.unlinkSync(badFile);
  });

  it("handles multer file size limit", async () => {
    const hugeFile = path.join(__dirname, "huge.jpg");

    fs.writeFileSync(
      hugeFile,
      Buffer.alloc(6 * 1024 * 1024)
    );

    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", hugeFile)
      .field("question", "Q")
      .field("answer", "A");

    expect(res.status).toBe(400);

    fs.unlinkSync(hugeFile);
  });

  it("returns 404 if question was deleted before delete route", async () => {
  const q = await createQuiz(token, {
    question: "Temp",
    answer: "Temp",
  });

  await prisma.question.delete({
    where: { id: q.id },
  });

  const res = await request(app)
    .delete(`/api/questions/${q.id}`)
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(404);
  });
});

describe("Global & Middleware Coverage", () => {

  it("covers Zod validation error (Line 15)", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "" }); 
    expect(res.status).toBe(400);
  });

  

  it("question not found", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get("/api/questions/1000")
      .set("Authorization", `Bearer ${token}`)
    expect(res.status).toBe(404);
  });


});


