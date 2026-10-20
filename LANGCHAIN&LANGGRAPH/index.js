import express from "express"
import dotenv from "dotenv"
import { ChatGroq } from "@langchain/groq"
import { MemorySaver, MessagesAnnotation, StateGraph } from "@langchain/langgraph"
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { TavilySearch } from "@langchain/tavily"

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 5000

app.use(express.json())

const tools = process.env.TAVILY_API_KEY
  ? [
      new TavilySearch({
        maxResults: 5,
        topic: "general"
      })
    ]
  : []

if (tools.length === 0) {
  console.warn("TAVILY_API_KEY is not configured; real-time search is disabled")
}

const toolNode = new ToolNode(tools)
const checkpointer = new MemorySaver()

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0.7,
  maxRetries: 2
}).bindTools(tools)

const callLLM = async (state) => {
  const response = await llm.invoke([
    {
      role: "system",
      content: `You are Jarvis, an AI assistant.

Use conversation memory first.

Only use tools when the answer requires external, real-time information
such as weather, news, web searches, or stock prices.

Do not call tools for simple conversation, memory-based questions,
greetings, or personal context.`
    },
    ...state.messages
  ])

  return { messages: [response] }
}

const shouldContinue = (state) => {
  const lastMessage = state.messages.at(-1)

  return lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0
    ? "tools"
    : "__end__"
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callLLM)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .compile({ checkpointer })

app.post("/ai", async (req, res) => {
  const { input, threadId = "user123" } = req.body

  if (typeof input !== "string" || input.trim().length === 0) {
    return res.status(400).json({ error: "input must be a non-empty string" })
  }

  try {
    const response = await graph.invoke(
      {
        messages: [
          {
            role: "user",
            content: input
          }
        ]
      },
      { configurable: { thread_id: String(threadId) } }
    )

    const lastMessage = response.messages.at(-1)
    return res.status(200).json({ ai: lastMessage.content })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    return res.status(502).json({ error: message })
  }
})

app.get("/", (req, res) => {
  return res.json({ message: "hello from level4" })
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
