import NextAuth, { type NextAuthConfig, type NextAuthResult, type Session } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@paybook/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const config: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        })

        if (!user) return null

        const passwordMatch = await bcrypt.compare(password, user.passwordHash)
        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}

const nextAuth: NextAuthResult = NextAuth(config)
export const handlers = nextAuth.handlers
export const signIn = nextAuth.signIn
export const signOut = nextAuth.signOut

// Explicit portable type to work around TS2742: Auth.js v5 beta's auth type
// references next-auth internal paths which TypeScript cannot name portably.
type AugmentedRequest = NextRequest & { auth: Session | null }
type AuthMiddlewareFn = (req: AugmentedRequest, ctx?: unknown) =>
  NextResponse | Response | void | Promise<NextResponse | Response | void>

export const auth: {
  (): Promise<Session | null>
  (callback: AuthMiddlewareFn): (req: NextRequest, ctx?: unknown) => Promise<Response>
} = nextAuth.auth as never
