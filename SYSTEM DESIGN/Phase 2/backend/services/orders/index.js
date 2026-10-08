import express from "express"

const app = express()
const port = process.env.PORT || 8002

app.use(express.json())

app.get("/", (_req, res) => {
    res.json({ service: "orders", message: "orders service is running" })
})

app.get("/health", (_req, res) => {
    res.json({ service: "orders", status: "ok" })
})

app.post("/", (req, res) => {
    const { productId, quantity } = req.body

    if (!productId || !quantity) {
        return res.status(400).json({ message: "productId and quantity are required" })
    }

    return res.status(201).json({
        message: "order created",
        order: { productId, quantity }
    })
})

app.listen(port, () => {
    console.log(`orders service started on port ${port}`)
})
