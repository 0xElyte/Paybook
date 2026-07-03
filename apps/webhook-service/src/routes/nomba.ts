import { Router } from 'express'
import express from 'express'
import { handleVirtualAccountFunded } from '../handlers/virtual-account-funded'

export const nombaRouter = Router()

// CRITICAL: raw body must be preserved for HMAC signature verification.
// express.raw() must run before any JSON parser for this specific route.
nombaRouter.post('/nomba', express.raw({ type: 'application/json' }), handleVirtualAccountFunded)
