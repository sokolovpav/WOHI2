const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require('path');

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
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});



function formatQuestion(question){
    return{
        ...question,
        question: question.question,
        answer: question.answer,
        userName: question.user ? question.user.name : null,
        user: undefined
    };
}

    // "id": 6,
    // "question": "What color do you get when you mix blue and yellow?",
    // "answer": "Green",
    // "userId": 2,

router.use(authenticate);

//  GET /api/questions?page=1&limit=5
router.get("/", async (req, res) => {
        
    const page = Math.max(1, parseInt(req.query.page));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit)|| 5 ));

    const skip = (page - 1) * limit;
    
    const [questions, total] = await Promise.all([prisma.question.findMany({
      orderBy: { id: "asc" },
      include: {user: true},
      skip,
      take: limit
        }), prisma.question.count()]);
    
    res.json({
        data: questions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
    });
    // res.json();
});

//  GET /api/questions/:questId
router.get("/:questId", async (req,res) => {
    const questId = Number(req.params.questId);
    const question = await prisma.question.findUnique({
    where: { id: questId },
    include: {user: true},
  });

    if(!question){
        return res.status(404).json({msg: "Question not found"})
    }
    // res.json(question);
    res.json(formatQuestion(question));
});

// Create new question
// POST /api/questions
router.post("/", upload.single("image"), async (req,res) => {  
    const {question, answer} = req.body;
    if(!question || !answer){
        return res.status(400).json({msg: "Question and answer are required"})
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const newQuestion = await prisma.question.create({
        data: { 
            question: question, 
            answer: answer,
            userId: req.user.userId,
            imageUrl
        }
    }); 
   
    res.status(201).json(newQuestion);
});

//  PUT /api/questions/:questId
router.put("/:questId", isOwner, upload.single("image"), async (req,res) => {
    const questId = Number(req.params.questId);
    const questExist = await prisma.question.findUnique({ where: { id: questId } });
    if(!questExist){
        return res.status(404).json({msg: "Question not found"})
    }
    

    const {question, answer} = req.body;
    if(!question || !answer){
        return res.status(400).json({msg: "Question and answer are required"})
    }
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : questExist.imageUrl;
  
    const questionUpdate = await prisma.question.update({
    where: { id: questId },
    include: {user: true}, 
    data: {
        question: question, 
        answer: answer,
        imageUrl
    }
    });
    
    res.json(questionUpdate); 
    
});

//  DELETE /api/questions/:questId
router.delete("/:questId", isOwner, async (req,res) => {
    const questId = Number(req.params.questId);
    const questExist = await prisma.question.findUnique({ 
        where: { id: questId },
        include: {user: true},
    });
    
    if(!questExist){
        return res.status(404).json({msg: "Question not found"})
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
    return res.status(404).json({ msg: "Question not found" });
  }

  // Check if an empty response was sent
  if (!answer || answer.trim() === "") {
    return res.status(400).json({ msg: "Answer is required" });
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
    await prisma.question.update({
      where: { id: questId },
      data: { solved: true },
    });
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
