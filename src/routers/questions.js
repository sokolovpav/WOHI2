const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const questions = require("../data/questions")

//  GET /api/questions
router.get("/", (req, res) => {
    res.json(questions);
});

//  GET /api/questions/:questId
router.get("/:questId", (req,res) => {
    const questId = Number(req.params.questId);
    const question = questions.find(q=>q.id === questId);
    if(!question){
        return res.status(404).json({msg: "Question not found"})
    }
    res.json(question);
});

// POST /api/questions
router.post("/", (req,res) => {
    const {question, answer} = req.body;
    if(!question || !answer){
        return res.status(400).json({msg: "Question and answer are required"})
    }

    const existingIds = questions.map(q=>q.id)
    const maxId = Math.max(...existingIds)
    const newQuestion ={
        id: questions.length ? maxId + 1:1, 
        question, answer
    }
    questions.push(newQuestion);
    res.status(201).json(newQuestion);
});

//  PUT /api/questions/:questId
router.put("/:questId", (req,res) => {
    const questId = Number(req.params.questId);
    const questionEdit = questions.find(q=>q.id === questId);
    if(!questionEdit){
        return res.status(404).json({msg: "Question not found"})
    }

    const {question, answer} = req.body;
    if(!question || !answer){
        return res.status(400).json({msg: "Question and answer are required"})
    }

    questionEdit.question = question;
    questionEdit.answer = answer;
    res.json(questionEdit); 
    
});

//  DELETE /api/questions/:questId
router.delete("/:questId", (req,res) => {
    const questId = Number(req.params.questId);
    const questIndex = questions.findIndex (q=>q.id === questId);
    
    if(questIndex === -1){
        return res.status(404).json({msg: "Question not found"})
    }

    const deletedQuestion = questions.splice(questIndex, 1 );
    res.json({
        msg: "Question deleted successfully",
        post: deletedQuestion

    })
})

module.exports = router;
