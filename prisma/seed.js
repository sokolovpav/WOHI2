const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedQuestions = [
  {
        id: 1,
        question: "What is the capital of France?",
        answer: "Paris"
    },
    {
        id: 2,
        question: "How many legs does a spider have?",
        answer: "Eight"
    },
    {
        id: 3,
        question: "What is the freezing point of water?",
        answer: "Zero degrees Celsius"
    },
    {
        id: 4,
        question: "Which animal is known as the 'King of the Jungle'?",
        answer: "Lion"
    },
    {
        id: 5,
        question: "What color do you get when you mix blue and yellow?",
        answer: "Green"
    },
];

async function main() {
  await prisma.question.deleteMany();
  
  // Create a default user
  const hashedPassword = await bcrypt.hash("1234", 12);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log("Created user:", user.email);

  for (const item of seedQuestions) {
    await prisma.question.create({
      data: {
        question: item.question,
        answer: item.answer,
        userId: user.id,
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());