import express from "express"

const app = express()
const port = process.env.PORT || 8003

app.use(express.json())

app.get("/", (_req, res) => {
    res.json({ service: "payment", message: "payment service is running" })
})

app.get("/health", (_req, res) => {
    res.json({ service: "payment", status: "ok" })
})

app.post("/", (req, res) => {
    const { orderId, amount } = req.body

    if (!orderId || !amount) {
        return res.status(400).json({ message: "orderId and amount are required" })
    }

    return res.status(201).json({
        message: "payment created",
        payment: { orderId, amount, status: "pending" }
    })
})

app.listen(port, () => {
    console.log(`payment service started on port ${port}`)
})
