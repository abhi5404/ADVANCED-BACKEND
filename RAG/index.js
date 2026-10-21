import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { readFile } from "node:fs/promises";
import { ChatGroq } from "@langchain/groq";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PDFParse } from "pdf-parse";
import { TaskType } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = Number.parseInt(process.env.PORT ?? "5000", 10);
const collectionName = process.env.QDRANT_COLLECTION_NAME ?? "grocery-store";
const groqModel = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";
const knowledgePdfPath = new URL("./knowledge.pdf", import.meta.url);

app.use(express.json());
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (file.mimetype !== "application/pdf") {
            return callback(new Error("Only PDF files are supported."));
        }

        callback(null, true);
    },
});

const requiredEnvironmentVariables = ["GROQ_API_KEY", "GOOGLE_API_KEY"];
const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
    (name) => !process.env[name],
);

if (missingEnvironmentVariables.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingEnvironmentVariables.join(", ")}`,
    );
}

const llm = new ChatGroq({
    model: groqModel,
    temperature: 0.7,
    maxTokens: 100,
    maxRetries: 2,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "Document title",
});

const vectorStorePromise = QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL ?? "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY,
    collectionName,
});

const indexPdf = async (buffer) => {
    const pdf = new PDFParse({ data: buffer });
    try {
        const result = await pdf.getText();
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const documents = await splitter.createDocuments([result.text]);
        const vectorStore = await vectorStorePromise;

        await vectorStore.addDocuments(documents);

        return documents.length;
    } finally {
        await pdf.destroy();
    }
};

const indexKnowledgePdf = async () => {
    const buffer = await readFile(knowledgePdfPath);
    const documentCount = await indexPdf(buffer);
    console.log(`Indexed ${documentCount} document chunks from knowledge.pdf.`);
};

app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: "Attach a PDF using the 'file' form field.",
        });
    }

    try {
        const documentCount = await indexPdf(req.file.buffer);
        return res.status(201).json({
            message: "PDF uploaded and indexed successfully.",
            documentCount,
            collectionName,
        });
    } catch (error) {
        console.error("PDF upload failed:", error);
        return res.status(500).json({
            error: "The PDF could not be uploaded.",
        });
    }
});

app.use((error, _req, res, next) => {
    if (error instanceof multer.MulterError || error?.message === "Only PDF files are supported.") {
        return res.status(400).json({ error: error.message });
    }

    next(error);
});

app.post("/ai", async (req, res) => {
    const { input } = req.body;

    if (typeof input !== "string" || input.trim().length === 0) {
        return res.status(400).json({
            error: "The request body must include a non-empty string input.",
        });
    }

    try {
        const vectorStore = await vectorStorePromise;
        const documents = await vectorStore.similaritySearch(input.trim(), 5);
        const context = documents.map((document) => document.pageContent).join("\n\n");

        const response = await llm.invoke([
            new SystemMessage(`You are a RAG AI assistant.

STRICT RULES:
- Answer only from the supplied context.
- Do not use outside knowledge.
- If the answer is not found in the context, say:
  "I don't know from uploaded PDF."

Context:
${context}`),
            new HumanMessage(input.trim()),
        ]);

        return res.status(200).json({ ai: response.content });
    } catch (error) {
        console.error("AI request failed:", error);
        return res.status(500).json({
            error: "The AI request could not be completed.",
        });
    }
});

app.get("/", (_req, res) => {
    return res.json({ message: "hello from level4" });
});

const startServer = async () => {
    await indexKnowledgePdf();
    app.listen(port, () => {
        console.log(`Server started on port ${port}`);
    });
};

startServer().catch((error) => {
    console.error("Server startup failed:", error);
    process.exitCode = 1;
});
