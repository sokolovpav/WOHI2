const express = require('express');
const prisma = require("./lib/prisma");
const app = express();
const questionsRouter = require("./routers/questions");
const authRouter = require("./routers/auth");
const path = require('path');
const PORT = process.env.PORT || 3000;


app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());
app.use("/api/auth",authRouter)
app.use("/api/questions",questionsRouter)

app.use((req,res) => {
    res.status(404).json({msg: "Not found"})
})

// Hello World route
app.get('/', (req, res) => {
    res.json({ message: 'Hello, World!' });
});

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});