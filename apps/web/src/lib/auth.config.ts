import type { NextAuthConfig } from 'next-auth'

// Edge-safe subset of the Auth.js config, shared with src/middleware.ts.
// It must not (transitively) import Prisma, bcryptjs, or anything else
// Node-only: the middleware bundle has a 1 MB Edge Function limit on the
// Hobby plan, and JWT session checks only need the cookie + AUTH_SECRET.
// The Credentials provider (which needs the database) lives in lib/auth.ts.
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.emailVerified = (token.emailVerified as Date | null) ?? null
      }
      return session
    },
  },
}
