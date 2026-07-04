import 'dotenv/config'
import express from 'express'
import { prisma } from '@paybook/db'
import { nombaRouter } from './routes/nomba'

const app = express()
const PORT = process.env.PORT ?? 3001

// Global JSON parser for every route except the webhook — that one needs the
// raw body preserved for HMAC signature verification (see routes/nomba.ts).
app.use((req, res, next) => {
  if (req.path === '/webhooks/nomba') return next()
  express.json()(req, res, next)
})

app.use('/webhooks', nombaRouter)

app.get('/health', async (_req, res) => {
  try {
    // Bound the DB check so a hung connection (e.g. a slow/unreachable pool)
    // can never hold this request open indefinitely — fail fast and visibly
    // instead of leaving the platform's health probe waiting forever.
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB health check timed out after 5s')), 5000)),
    ])
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
