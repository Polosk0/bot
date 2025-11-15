export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface UserData {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  joinedAt: Date;
  lastActive: Date;
  warnings: number;
  isBanned: boolean;
  banReason?: string;
  banExpires?: Date;
  invitedBy?: string;
  oauthScope?: string[];
  oauthExpiresAt?: Date;
  hasOAuth?: boolean;
}

export interface UserOAuthToken {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
  updatedAt: Date;
}

export interface ServerConfig {
  guildId: string;
  prefix: string;
  logChannelId?: string;
  ticketChannelId?: string;
  vouchChannelId?: string;
  verificationChannelId?: string;
  webhookUrl?: string;
  autoRoleId?: string;
  vouchRoleId?: string;
  verifiedRoleId?: string;
  unverifiedRoleId?: string;
  adminRoleId?: string;
  moderatorRoleId?: string;
  antiScamEnabled: boolean;
  captchaEnabled: boolean;
  captchaChannelId?: string;
  webVerificationEnabled?: boolean;
  ticketCategoryRefundId?: string;
  ticketCategoryBoxingId?: string;
  ticketCategories: string[];
}

export interface CaptchaData {
  id: string;
  userId: string;
  code: string;
  imageBuffer: Buffer;
  createdAt: Date;
  expiresAt: Date;
  verified: boolean;
  attempts?: number;
  type?: string;
}

export interface TicketData {
  id: string;
  userId: string;
  channelId: string;
  category: 'refund' | 'boxing' | 'other';
  status: 'open' | 'closed' | 'pending';
  createdAt: Date;
  closedAt?: Date;
  closedBy?: string;
}

export interface VouchData {
  id: string;
  userId: string;
  targetUserId: string;
  message: string;
  rating: number;
  createdAt: Date;
  approved: boolean;
  approvedBy?: string;
}

export interface LogData {
  id: string;
  type: 'message_delete' | 'message_edit' | 'member_join' | 'member_leave' | 'role_add' | 'role_remove' | 'channel_create' | 'channel_delete' | 'ban' | 'kick' | 'warn' | 'lock' | 'vouch' | 'clear' | 'nuke' | 'verification';
  userId: string;
  moderatorId?: string;
  channelId?: string;
  reason?: string;
  amount?: number;
  data: any;
  timestamp: Date;
}

