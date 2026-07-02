import 'dotenv/config'
import express from 'express'
import { prisma } from '@paybook/db'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json())

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status: 'ok',
      db: 'connected',
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV ?? 'development',
      service: 'webhook-service',
    })
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'unreachable',
      error: err instanceof Error ? err.message : 'unknown error',
      service: 'webhook-service',
    })
  }
})

app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: 'webhook-service',
      event: 'startup',
      port: PORT,
      environment: process.env.NODE_ENV ?? 'development',
    })
  )
})

export default app
