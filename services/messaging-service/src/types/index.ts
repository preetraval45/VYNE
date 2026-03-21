// ─── Core Domain Types ────────────────────────────────────────────────────────

export type ChannelType = 'public' | 'private' | 'dm' | 'system';
export type MemberRole = 'owner' | 'admin' | 'member';
export type NotificationPreference = 'all' | 'mentions' | 'none';
export type MessageType = 'text' | 'system' | 'ai_bot' | 'rich_embed';
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
export type UserRole = 'owner' | 'admin' | 'member' | 'guest';

// ─── Channel ──────────────────────────────────────────────────────────────────

export interface Channel {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  type: ChannelType;
  isSystem: boolean;
  topic: string | null;
  createdBy: string;
  archivedAt: Date | null;
  createdAt: Date;
}

export interface ChannelRow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  type: ChannelType;
  is_system: boolean;
  topic: string | null;
  created_by: string;
  archived_at: Date | null;
  created_at: Date;
}

export interface CreateChannelInput {
  name: string;
  description?: string;
  type?: ChannelType;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  topic?: string;
}

// ─── Channel Member ───────────────────────────────────────────────────────────

export interface ChannelMember {
  channelId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  lastReadAt: Date;
  notificationPreference: NotificationPreference;
}

export interface ChannelMemberRow {
  channel_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: Date;
  last_read_at: Date;
  notification_preference: NotificationPreference;
}

// ─── Message ──────────────────────────────────────────────────────────────────

export interface MessageAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  key: string;
}

export interface RichEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: string;
  imageUrl?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
  timestamp?: string;
}

export interface MessageReactions {
  [emoji: string]: string[]; // emoji -> array of userIds who reacted
}

export interface Message {
  id: string;
  orgId: string;
  channelId: string;
  userId: string;
  content: string | null;
  contentRich: Record<string, unknown> | null;
  type: MessageType;
  threadId: string | null;
  replyCount: number;
  reactions: MessageReactions;
  attachments: MessageAttachment[];
  richEmbed: RichEmbed | null;
  isEdited: boolean;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface MessageRow {
  id: string;
  org_id: string;
  channel_id: string;
  user_id: string;
  content: string | null;
  content_rich: Record<string, unknown> | null;
  type: MessageType;
  thread_id: string | null;
  reply_count: number;
  reactions: MessageReactions;
  attachments: MessageAttachment[];
  rich_embed: RichEmbed | null;
  is_edited: boolean;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
}

export interface MessageWithUser extends Message {
  user: {
    id: string;
    email?: string;
    name?: string;
  };
}

export interface SendMessageInput {
  content?: string;
  contentRich?: Record<string, unknown>;
  type?: MessageType;
  threadId?: string;
  attachments?: MessageAttachment[];
  richEmbed?: RichEmbed;
}

// ─── DM Conversations ─────────────────────────────────────────────────────────

export interface DmConversation {
  id: string;
  orgId: string;
  createdAt: Date;
  participants?: string[];
}

export interface DmConversationRow {
  id: string;
  org_id: string;
  created_at: Date;
}

export interface DmParticipantRow {
  conversation_id: string;
  user_id: string;
}

// ─── User Presence ────────────────────────────────────────────────────────────

export interface UserPresence {
  userId: string;
  orgId: string;
  status: PresenceStatus;
  lastSeenAt: Date;
}

export interface UserPresenceRow {
  user_id: string;
  org_id: string;
  status: PresenceStatus;
  last_seen_at: Date;
}

// ─── Message Bookmark ─────────────────────────────────────────────────────────

export interface MessageBookmark {
  id: string;
  messageId: string;
  userId: string;
  createdAt: Date;
}

export interface MessageBookmarkRow {
  id: string;
  message_id: string;
  user_id: string;
  created_at: Date;
}

// ─── Auth / Request ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  orgId: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface SocketChannelJoinPayload {
  channelId: string;
}

export interface SocketChannelLeavePayload {
  channelId: string;
}

export interface SocketMessageSendPayload {
  channelId: string;
  content?: string;
  contentRich?: Record<string, unknown>;
  type?: MessageType;
  threadId?: string;
  attachments?: MessageAttachment[];
  richEmbed?: RichEmbed;
}

export interface SocketTypingPayload {
  channelId: string;
}

export interface SocketPresenceUpdatePayload {
  status: PresenceStatus;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface PaginatedMessages {
  messages: MessageWithUser[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PresignedUploadUrl {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

// ─── Embedding Job ────────────────────────────────────────────────────────────

export interface EmbeddingJobData {
  messageId: string;
  content: string;
}

// ─── Fastify Augmentation ─────────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}
