import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { createClient } from 'redis'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redis = createClient({ url: redisUrl })

redis.on('error', (error) => console.error('Redis error:', error.message))
app.use(cors())
app.use(express.json())

app.get('/api/health', async (_request, response) => {
  response.json({ status: 'ok', service: 'backend', redis: redis.isReady ? 'connected' : 'disconnected' })
})

app.get('/api', (_request, response) => response.json({ message: 'Phase 2 API is running' }))

const server = app.listen(port, () => console.log(`Backend running on port ${port}`))

try {
  await redis.connect()
  console.log('Redis connected')
} catch (error) {
  console.error('Redis connection failed:', error.message)
}

const shutdown = async () => {
  await redis.quit().catch(() => {})
  server.close(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
