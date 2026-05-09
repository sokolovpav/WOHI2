const { resetDb, registerAndLogin, request, app, prisma, createQuiz } = require("./helpers");
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


// it("returns 403 when editing someone else's post", async () => {
//   const aliceToken = await registerAndLogin("alice@test.io", "Alice");
//   const post = await createQuiz(aliceToken, { question: "QQ", amswer:"AA" });

//   const bobToken = await registerAndLogin("bob@test.io", "Bob");
//   const res = await request(app).put(`/api/posts/${post.id}`)
//     .set("Authorization", `Bearer ${bobToken}`)
//     .send({ question: "hijacked", answer: "x" });

//   expect(res.status).toBe(403);

//   const after = await prisma.post.findUnique({ where: { id: post.id } });
//   expect(after.question).toBe("QQ");  // unchanged
// });

