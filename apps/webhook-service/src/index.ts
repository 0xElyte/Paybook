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

// Deployment platforms (Render, Railway, etc.) gate whether a deploy ever goes
// live on this route responding — it must never depend on the database, or a
// DB connectivity problem blocks the whole service from ever getting a public
// URL, not just the health-check semantics. Process-alive only.
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? 'development',
    service: 'webhook-service',
  })
})

// Separate, explicit DB-connectivity check — not used as the platform's
// deploy health gate, just for us to diagnose reachability on demand.
app.get('/health/db', async (_req, res) => {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB health check timed out after 5s')), 5000)),
    ])
    res.json({ status: 'ok', db: 'connected' })
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'unreachable',
      error: err instanceof Error ? err.message : 'unknown error',
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
