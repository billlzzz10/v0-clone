import { compare } from 'bcrypt-ts'
import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createGuestUser, getUser } from '@/lib/db/queries'
import { getApiKeyInfo } from '@/lib/api-key/queries'
import { authConfig } from './auth.config'
import { DUMMY_PASSWORD } from '@/lib/constants'
import type { DefaultJWT } from 'next-auth/jwt'

const isDevelopment = process.env.NODE_ENV === 'development'

// Check for required environment variables
// Set default AUTH_SECRET for development if missing
if (!process.env.AUTH_SECRET && isDevelopment) {
  console.warn(
    '⚠️  AUTH_SECRET not found. Using default secret for development.\n' +
      'For production, please set AUTH_SECRET in your environment variables.\n',
  )
  process.env.AUTH_SECRET = 'dev-secret-key-not-for-production'
}

export type UserType = 'guest' | 'regular'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      type: UserType
      hasApiKey?: boolean
      apiKeySource?: 'kilogateway' | 'manual' | null
    } & DefaultSession['user']
  }

  interface User {
    id?: string
    email?: string | null
    type: UserType
    hasApiKey?: boolean
    apiKeySource?: 'kilogateway' | 'manual' | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    type: UserType
    hasApiKey?: boolean
    apiKeySource?: 'kilogateway' | 'manual' | null
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email)

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD)
          return null
        }

        const [user] = users

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD)
          return null
        }

        const passwordsMatch = await compare(password, user.password)

        if (!passwordsMatch) return null

        return { ...user, type: 'regular' }
      },
    }),
    Credentials({
      id: 'guest',
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser()
        return { ...guestUser, type: 'guest' }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.type = user.type

        // Fetch API key info on login
        try {
          const apiKeyInfo = await getApiKeyInfo(user.id as string)
          token.hasApiKey = !!apiKeyInfo?.source
          token.apiKeySource = apiKeyInfo?.source || null
        } catch (error) {
          console.error('[Auth] Error fetching API key info:', error)
          token.hasApiKey = false
          token.apiKeySource = null
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.type = token.type
        session.user.hasApiKey = token.hasApiKey
        session.user.apiKeySource = token.apiKeySource
      }

      return session
    },
  },
})
