import express from "express"
import dotenv from "dotenv"
import { GoogleGenAI } from "@google/genai"

dotenv.config()

const app = express()
const port = 5000

app.use(express.json())

//-----------------------------------------------WITHOUT LANGCHAIN------------------------------------------------------------------

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY
// })

// app.post("/ai", async (req, res) => {
//   const { input } = req.body

//   try {
//     let interaction

//     try {
//       interaction = await ai.interactions.create({
//         model: "gemini-3.8-flash",
//         input
//       })
//     } catch (error) {
//       if (!error.message.includes("503")) {
//         throw error
//       }

//       interaction = await ai.interactions.create({
//         model: "gemini-2.5-flash",
//         input
//       })
//     }

//     return res.status(200).json({ ai: interaction.output_text })
//   } catch (error) {
//     return res.status(502).json({ error: error.message })
//   }
// })

//-----------------------------------------------WITH LANGCHAIN------------------------------------------------------------------



app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})