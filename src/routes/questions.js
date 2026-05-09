const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require('path');
const {NotFoundError,ValidationError} = require('../lib/errors');
const { z } = require("zod");

const QuestInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
});



const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new ValidationError("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function formatQuestion(question){
    return{
        ...question,
        keywords: question.keywords ? question.keywords.map((k) => k.name) : [],
        question: question.question,
        answer: question.answer,
        userName: question.user ? question.user.name : null,
        user: undefined
    };
}

function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;

  if (typeof keywords === "string") {
    return keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  return [];
}

router.use(authenticate);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError ||
      err?.message === "Only image files are allowed") {
    return res.status(400).json({ msg: err.message });
  }
  next(err); // pass through to global handler
});


//  GET /api/questions?page=1&limit=5
router.get("/", async (req, res) => {
        
    const page = Math.max(1, parseInt(req.query.page));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit)|| 5 ));
    const userId = req.user.userId;

    const skip = (page - 1) * limit;
    const { keyword } = req.query;
    const where = keyword
      ? { keywords: { some: { name: keyword } } }
      : {};
    
    const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { id: "asc" },
      include: {
        user: true,
        attempts: {
          where: {
            userId: userId
          }
        },
        solvedBy: {
          where: {
            userId: userId
          }
        }
      },
      skip,
      take: limit
    }),
    prisma.question.count({where})
  ]);

    // Add the number of attempts to each question
    const questionsWithUserData = questions.map(question => {
    const isSolvedByUser = question.solvedBy.length > 0;
    const userAttempts = question.attempts;
    const correctAttempts = userAttempts.filter(a => a.isCorrect).length;
    
    
    return {
      ...formatQuestion(question),
      solved: isSolvedByUser, // solved
      attemptsCount: userAttempts.length,
      
      userCorrectAttempts: correctAttempts,
    //   lastAttempt: userAttempts[userAttempts.length - 1]?.createdAt || null
    };
    });
    
    res.json({
        // data: questions.map(formatQuestion),
        data: questionsWithUserData,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
    });
    // res.json();
});

//  GET /api/questions/:questId
router.get("/:questId", async (req, res) => {
  const questId = Number(req.params.questId);
  const userId = req.user.userId;

  const question = await prisma.question.findUnique({
    where: { id: questId },
    include: {
      user: true,
      keywords: true,
      attempts: {
        where: {
          userId: userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      },
      solvedBy: {
        where: {
          userId: userId
        }
      }
    },
  });

  if (!question) {
    throw new NotFoundError("Question not found");
  }

  const totalAttemptsForUser = await prisma.attempt.count({
    where: {
      questionId: questId,
      userId: userId
    }
  });

  const correctAttemptsForUser = await prisma.attempt.count({
    where: {
      questionId: questId,
      userId: userId,
      isCorrect: true
    }
  });

  const isSolvedByUser = question.solvedBy.length > 0;

  const formattedQuestion = {
    ...formatQuestion(question),
    solved: isSolvedByUser,
    attemptsCount: totalAttemptsForUser,
    correctAttemptsCount: correctAttemptsForUser,
    lastAttempts: question.attempts
  };

  res.json(formattedQuestion);
});

// Create new question
// POST /api/questions
router.post("/", upload.single("image"), async (req,res) => {  
    // const {question, answer, keywords} = req.body;

    const {question, answer, keywords} = QuestInput.parse(req.body); // throws ZodError on failure

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const keywordsArray = parseKeywords(keywords);
    
    const newQuestion = await prisma.question.create({
        data: { 
            question: question, 
            answer: answer,
            userId: req.user.userId,
            imageUrl,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                where: { name: kw },
                create: { name: kw },
                })),  
            },
        },   include: { keywords: true, user: true }, 
    }); 
   
    res.status(201).json(formatQuestion(newQuestion));
});

//  PUT /api/questions/:questId
router.put("/:questId", isOwner, upload.single("image"), async (req,res) => {
    const questId = Number(req.params.questId);
    const questExist = await prisma.question.findUnique({ where: { id: questId } });
    if(!questExist){
        throw new NotFoundError("Question not found");
    }
    

    // const {question, answer, keywords} = req.body;
    const {question, answer, keywords} = QuestInput.parse(req.body);

    const keywordsArray = parseKeywords(keywords);

    if(!question || !answer){
        throw new ValidationError("Question and answer are required");
    }
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : questExist.imageUrl;
  
    const questionUpdate = await prisma.question.update({
        where: { id: questId },
        include: {user: true, keywords: true}, 
        data: {
            question: question, 
            answer: answer,
            imageUrl,
            keywords: {
            set: [],
            connectOrCreate: keywordsArray.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
            })),
        },    
        }
    });
    
    res.status(201).json(formatQuestion(questionUpdate));
    // res.json(questionUpdate); 
    
});

//  DELETE /api/questions/:questId
router.delete("/:questId", isOwner, async (req,res) => {
    const questId = Number(req.params.questId);
    const questExist = await prisma.question.findUnique({ 
        where: { id: questId },
        include: {user: true},
    });
    
    if(!questExist){
        throw new NotFoundError("Question not found");
    }

    await prisma.question.delete({ where: { id: questId } });
    res.json({
        msg: "Question deleted successfully",
        post: questExist

    })
})

// POST /api/questions/:questId/play
router.post("/:questId/play", async (req, res) => {
  const questId = Number(req.params.questId);
  const { answer } = req.body;
  const userId = req.user.userId;

  // Checking if the question exists
  const question = await prisma.question.findUnique({
    where: { id: questId },
  });

  if (!question) {
    throw new NotFoundError("Question not found");
  }

  // Check if an empty response was sent
  if (!answer || answer.trim() === "") { 
    throw new ValidationError("Answer is required");
  }

  // Compare the answers (ignoring case, removing spaces)
  const isCorrect = answer.trim().toLowerCase() === question.answer.trim().toLowerCase();

  // Save the attempt to the database
  const attempt = await prisma.attempt.create({
    data: {
      questionId: questId,
      userId: userId,
      answer: answer.trim(),
      isCorrect: isCorrect,
    },
  });

  // If the answer is correct, update the “solved” field for the question
  if (isCorrect) {
    // if the user has already resolved this quiz
    const alreadySolved = await prisma.solvedQuestion.findUnique({
      where: {
        questionId_userId: {
          questionId: questId,
          userId: userId
        }
      }
    });

    if (!alreadySolved) {
      await prisma.solvedQuestion.create({
        data: {
          questionId: questId,
          userId: userId,
        },
      });
    }
  }

  // Format the date
  const formattedDate = attempt.createdAt.toISOString().replace('T', ' ').substring(0, 19);

  res.json({
    id: attempt.id,
    correct: isCorrect,
    submittedAnswer: attempt.answer,
    correctAnswer: question.answer,
    createdAt: formattedDate,
  });
});

module.exports = router;
