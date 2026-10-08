import express from "express"

const app = express()
const port = process.env.PORT || 8001

app.use(express.json())

app.get("/", (_req, res) => {
    res.json({ service: "auth", message: "auth service is running" })
})

app.get("/health", (_req, res) => {
    res.json({ service: "auth", status: "ok" })
})

app.post("/register", (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.status(400).json({ message: "email is required" })
    }

    return res.status(201).json({ message: "user registered", email })
})

app.listen(port, () => {
    console.log(`auth service started on port ${port}`)
})
