const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");

//  GET /api/questions
router.get("/", async (req, res) => {
    const questions = await prisma.question.findMany({
      orderBy: { id: "asc" },
    });
    res.json(questions);
});

//  GET /api/questions/:questId
router.get("/:questId", async (req,res) => {
    const questId = Number(req.params.questId);
    const question = await prisma.question.findUnique({
    where: { id: questId }
  });

    if(!question){
        return res.status(404).json({msg: "Question not found"})
    }
    res.json(question);
});

// POST /api/questions
router.post("/", async (req,res) => {
    const {question, answer} = req.body;
    if(!question || !answer){
        return res.status(400).json({msg: "Question and answer are required"})
    }

    const newQuestion = await prisma.question.create({
        data: { 
            question: question, 
            answer: answer
        }
    }); 
   
    res.status(201).json(newQuestion);
});

//  PUT /api/questions/:questId
router.put("/:questId", async (req,res) => {
    const questId = Number(req.params.questId);
    const questExist = await prisma.question.findUnique({ where: { id: questId } });
    if(!questExist){
        return res.status(404).json({msg: "Question not found"})
    }

    const {question, answer} = req.body;
    if(!question || !answer){
        return res.status(400).json({msg: "Question and answer are required"})
    }

    const questionUpdate = await prisma.question.update({
    where: { id: questId },
    data: {
        question: question, 
        answer: answer
    }
    });
    
    res.json(questionUpdate); 
    
});

//  DELETE /api/questions/:questId
router.delete("/:questId", async (req,res) => {
    const questId = Number(req.params.questId);
    const questExist = await prisma.question.findUnique({ where: { id: questId } });
    
    if(!questExist){
        return res.status(404).json({msg: "Question not found"})
    }

    await prisma.question.delete({ where: { id: questId } });
    res.json({
        msg: "Question deleted successfully",
        post: questExist

    })
})

module.exports = router;
