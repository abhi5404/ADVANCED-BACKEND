import "dotenv/config"
import express from "express"
import proxy from "express-http-proxy"

const app = express()
const port = process.env.PORT || 8080

app.get("/health", (_req, res) => {
    res.json({ service: "api-gateway", status: "ok" })
})

app.use("/auth", proxy(process.env.AUTH_SERVICE_URL))
app.use("/orders", proxy(process.env.ORDERS_SERVICE_URL))
app.use("/payments", proxy(process.env.PAYMENT_SERVICE_URL))

app.use((_req, res) => {
    res.status(404).json({ message: "route not found" })
})

app.listen(port, () => {
    console.log(`api gateway started on port ${port}`)
})
