import type { InferSelectModel } from 'drizzle-orm'
import {
  pgTable,
  varchar,
  timestamp,
  uuid,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  // API Key management fields
  api_key_encrypted: varchar('api_key_encrypted', { length: 512 }), // Encrypted Kilogateway API key
  api_key_source: varchar('api_key_source', { length: 32 }), // 'kilogateway', 'manual', or null
  api_key_validated_at: timestamp('api_key_validated_at'), // When key was last validated
  api_key_rotation_date: timestamp('api_key_rotation_date'), // When key was created/rotated
  kilogateway_user_id: varchar('kilogateway_user_id', { length: 255 }), // Kilogateway user ID for session linking
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export type User = InferSelectModel<typeof users>

// Simple ownership mapping for v0 chats
// The actual chat data lives in v0 API, we just track who owns what
export const chat_ownerships = pgTable(
  'chat_ownerships',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    v0_chat_id: varchar('v0_chat_id', { length: 255 }).notNull(), // v0 API chat ID
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Ensure each v0 chat can only be owned by one user
    unique_v0_chat: unique().on(table.v0_chat_id),
  }),
)

export type ChatOwnership = InferSelectModel<typeof chat_ownerships>

// Track anonymous chat creation by IP for rate limiting
export const anonymous_chat_logs = pgTable('anonymous_chat_logs', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  ip_address: varchar('ip_address', { length: 45 }).notNull(), // IPv6 can be up to 45 chars
  v0_chat_id: varchar('v0_chat_id', { length: 255 }).notNull(), // v0 API chat ID
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export type AnonymousChatLog = InferSelectModel<typeof anonymous_chat_logs>
