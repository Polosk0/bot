import { Collection } from 'discord.js';
import { UserData, ServerConfig, CaptchaData, TicketData, VouchData, LogData, UserOAuthToken } from '../types/database';
import { logger } from '../utils/logger';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface DatabaseSchema {
  users: { [key: string]: any };
  userTokens: { [key: string]: any };
  serverConfigs: { [key: string]: any };
  captchas: { [key: string]: any };
  tickets: { [key: string]: any };
  vouches: { [key: string]: any };
  logs: { [key: string]: any };
  messages: { [key: string]: any };
  warns: { [key: string]: any };
}

export class DatabaseManager {
  private static dbPath: string = join(__dirname, '../../data/database.json');
  private static data: DatabaseSchema;

  constructor() {
    if (!DatabaseManager.data) {
      this.loadDatabase();
    }
  }

  private loadDatabase() {
    const dataDir = join(__dirname, '../../data');
    
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    if (existsSync(DatabaseManager.dbPath)) {
      try {
        const fileData = readFileSync(DatabaseManager.dbPath, 'utf-8');
        DatabaseManager.data = JSON.parse(fileData);
        if (!DatabaseManager.data.userTokens) {
          DatabaseManager.data.userTokens = {};
        }
      } catch (error) {
        logger.error('Erreur lors du chargement de la base de données:', error);
        DatabaseManager.data = this.createEmptyDatabase();
      }
    } else {
      DatabaseManager.data = this.createEmptyDatabase();
      this.saveDatabase();
    }
  }

  private createEmptyDatabase(): DatabaseSchema {
    return {
      users: {},
      userTokens: {},
      serverConfigs: {},
      captchas: {},
      tickets: {},
      vouches: {},
      logs: {},
      messages: {},
      warns: {}
    };
  }

  private saveDatabase() {
    try {
      writeFileSync(DatabaseManager.dbPath, JSON.stringify(DatabaseManager.data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde de la base de données:', error);
    }
  }

  public forceSave(): void {
    this.saveDatabase();
  }

  async initialize() {
    logger.info('Initialisation de la base de données...');
    await this.loadDefaultConfigs();
    logger.info('Base de données initialisée');
  }

  private async loadDefaultConfigs() {
    const defaultConfig = {
      guildId: process.env.GUILD_ID || '',
      prefix: '!',
      antiScamEnabled: true,
      captchaEnabled: true,
      ticketCategories: ['refund', 'boxing', 'other']
    };

    if (process.env.GUILD_ID && !DatabaseManager.data.serverConfigs[process.env.GUILD_ID]) {
      DatabaseManager.data.serverConfigs[process.env.GUILD_ID] = defaultConfig;
      this.saveDatabase();
    }
  }

  // Gestion des utilisateurs
  getUser(userId: string): UserData | undefined {
    const user = DatabaseManager.data.users[userId];
    if (!user) return undefined;

    return {
      ...user,
      joinedAt: new Date(user.joinedAt),
      lastActive: new Date(user.lastActive),
      banExpires: user.banExpires ? new Date(user.banExpires) : undefined
    };
  }

  getUserOAuthToken(userId: string): UserOAuthToken | undefined {
    const data = DatabaseManager.data.userTokens?.[userId];
    if (!data) {
      return undefined;
    }
    return {
      userId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
      scope: data.scope || [],
      updatedAt: new Date(data.updatedAt || Date.now())
    };
  }

  setUserOAuthToken(userId: string, token: UserOAuthToken): void {
    if (!DatabaseManager.data.userTokens) {
      DatabaseManager.data.userTokens = {};
    }

    DatabaseManager.data.userTokens[userId] = {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt.getTime(),
      scope: token.scope,
      updatedAt: token.updatedAt.getTime()
    };
    this.saveDatabase();
  }

  clearUserOAuthToken(userId: string): void {
    if (DatabaseManager.data.userTokens?.[userId]) {
      delete DatabaseManager.data.userTokens[userId];
      this.saveDatabase();
    }
  }

  getAllOAuthTokens(): UserOAuthToken[] {
    const tokens: UserOAuthToken[] = [];
    const entries = DatabaseManager.data.userTokens || {};
    for (const [userId, value] of Object.entries(entries)) {
      tokens.push({
        userId,
        accessToken: value.accessToken,
        refreshToken: value.refreshToken,
        expiresAt: new Date(value.expiresAt),
        scope: value.scope || [],
        updatedAt: new Date(value.updatedAt || Date.now())
      });
    }
    return tokens;
  }

  setUser(userData: UserData): void {
    DatabaseManager.data.users[userData.id] = {
      ...userData,
      joinedAt: userData.joinedAt.getTime(),
      lastActive: userData.lastActive.getTime(),
      banExpires: userData.banExpires?.getTime()
    };
    this.saveDatabase();
  }

  updateUser(userId: string, updates: Partial<UserData>): void {
    const user = this.getUser(userId);
    if (user) {
      this.setUser({ ...user, ...updates });
    }
  }

  // Gestion des configurations serveur
  getServerConfig(guildId: string): ServerConfig | undefined {
    const config = DatabaseManager.data.serverConfigs[guildId];
    return config || undefined;
  }

  setServerConfig(config: ServerConfig): void {
    DatabaseManager.data.serverConfigs[config.guildId] = config;
    this.saveDatabase();
  }

  updateServerConfig(guildId: string, updates: Partial<ServerConfig>): void {
    const config = this.getServerConfig(guildId);
    if (config) {
      this.setServerConfig({ ...config, ...updates });
    } else {
      const newConfig: ServerConfig = {
        guildId,
        prefix: '!',
        antiScamEnabled: true,
        captchaEnabled: true,
        ticketCategories: ['refund', 'boxing', 'other'],
        ...updates
      };
      this.setServerConfig(newConfig);
    }
  }

  // Gestion des captchas
  getCaptcha(captchaId: string): CaptchaData | undefined {
    const captcha = DatabaseManager.data.captchas[captchaId];
    if (!captcha) return undefined;

    return {
      ...captcha,
      imageBuffer: Buffer.from(captcha.imageBuffer, 'base64'),
      createdAt: new Date(captcha.createdAt),
      expiresAt: new Date(captcha.expiresAt)
    };
  }

  setCaptcha(captcha: CaptchaData): void {
    DatabaseManager.data.captchas[captcha.id] = {
      ...captcha,
      imageBuffer: captcha.imageBuffer.toString('base64'),
      createdAt: captcha.createdAt instanceof Date ? captcha.createdAt.getTime() : captcha.createdAt,
      expiresAt: captcha.expiresAt instanceof Date ? captcha.expiresAt.getTime() : captcha.expiresAt
    };
    this.saveDatabase();
  }

  // Gestion des tickets
  getTicket(ticketId: string): TicketData | undefined {
    const ticket = DatabaseManager.data.tickets[ticketId];
    if (!ticket) return undefined;

    return {
      ...ticket,
      createdAt: new Date(ticket.createdAt),
      closedAt: ticket.closedAt ? new Date(ticket.closedAt) : undefined
    };
  }

  setTicket(ticket: TicketData): void {
    DatabaseManager.data.tickets[ticket.id] = {
      ...ticket,
      createdAt: ticket.createdAt.getTime(),
      closedAt: ticket.closedAt?.getTime()
    };
    this.saveDatabase();
  }

  updateTicket(ticketId: string, updates: Partial<TicketData>): void {
    const ticket = this.getTicket(ticketId);
    if (ticket) {
      this.setTicket({ ...ticket, ...updates });
    }
  }

  getTicketsByUser(userId: string): TicketData[] {
    return Object.values(DatabaseManager.data.tickets)
      .filter((t: any) => t.userId === userId)
      .map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        closedAt: t.closedAt ? new Date(t.closedAt) : undefined
      }));
  }

  // Gestion des vouchs
  getVouch(vouchId: string): VouchData | undefined {
    const vouch = DatabaseManager.data.vouches[vouchId];
    if (!vouch) return undefined;

    return {
      ...vouch,
      createdAt: new Date(vouch.createdAt)
    };
  }

  setVouch(vouch: VouchData): void {
    DatabaseManager.data.vouches[vouch.id] = {
      ...vouch,
      createdAt: vouch.createdAt.getTime()
    };
    this.saveDatabase();
  }

  getVouchesByUser(userId: string): VouchData[] {
    return Object.values(DatabaseManager.data.vouches)
      .filter((v: any) => v.targetUserId === userId)
      .map((v: any) => ({
        ...v,
        createdAt: new Date(v.createdAt)
      }));
  }

  // Gestion des logs
  addLog(log: LogData): void {
    DatabaseManager.data.logs[log.id] = log;
    this.saveDatabase();
  }

  getLogsByType(type: string): LogData[] {
    return Object.values(DatabaseManager.data.logs)
      .filter((l: any) => l.type === type)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);
  }

  getLogsByUser(userId: string): LogData[] {
    return Object.values(DatabaseManager.data.logs)
      .filter((l: any) => l.userId === userId)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);
  }

  // Gestion des messages (pour les logs)
  saveMessage(messageId: string, authorId: string, channelId: string, content: string, attachments: any[], embeds: any[]): void {
    DatabaseManager.data.messages[messageId] = {
      id: messageId,
      authorId,
      channelId,
      content,
      attachments,
      embeds,
      createdAt: Date.now()
    };
    this.saveDatabase();
  }

  getMessage(messageId: string): any {
    return DatabaseManager.data.messages[messageId];
  }

  // Gestion des warns
  addWarn(userId: string, moderatorId: string, reason: string): string {
    const id = `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    DatabaseManager.data.warns[id] = {
      id,
      userId,
      moderatorId,
      reason,
      createdAt: Date.now()
    };
    this.saveDatabase();
    return id;
  }

  getWarnsByUser(userId: string): any[] {
    return Object.values(DatabaseManager.data.warns)
      .filter((w: any) => w.userId === userId)
      .map((w: any) => ({
        ...w,
        createdAt: new Date(w.createdAt)
      }))
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getWarnCount(userId: string): number {
    return Object.values(DatabaseManager.data.warns).filter((w: any) => w.userId === userId).length;
  }

  clearWarns(userId: string): void {
    const warnIds = Object.keys(DatabaseManager.data.warns).filter(
      id => DatabaseManager.data.warns[id].userId === userId
    );
    
    warnIds.forEach(id => delete DatabaseManager.data.warns[id]);
    this.saveDatabase();
  }

  // Gestion des captchas
  getCaptchasByUser(userId: string): CaptchaData[] {
    return Object.values(DatabaseManager.data.captchas)
      .filter((c: any) => c.userId === userId)
      .map((c: any) => ({
        ...c,
        imageBuffer: Buffer.from(c.imageBuffer, 'base64'),
        createdAt: new Date(c.createdAt),
        expiresAt: new Date(c.expiresAt)
      }));
  }

  deleteCaptcha(captchaId: string): void {
    delete DatabaseManager.data.captchas[captchaId];
    this.saveDatabase();
  }
}
