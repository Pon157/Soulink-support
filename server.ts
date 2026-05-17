import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDatabaseUrl = () => {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  const sep = base.includes('?') ? '&' : '?';
  // connection_limit — пул соединений
  // pool_timeout    — сколько ждать свободного соединения из пула (сек)
  // keepalives=1 + keepalives_idle=30 — TCP keepalive чтобы PG не дропал простаивающие соединения
  return `${base}${sep}connection_limit=5&pool_timeout=30&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5`;
};

const prisma = new PrismaClient({
  log: ['error'],
  datasourceUrl: buildDatabaseUrl(),
});

// ── Keepalive: каждые 4 минуты отправляем SELECT 1 чтобы соединение не умирало ──
// Обычный idle_session_timeout на хостингах — 5–10 минут.
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: any) {
    console.error('[Keepalive] failed, reconnecting…', e?.message);
    try {
      await prisma.$disconnect();
      await prisma.$connect();
    } catch (reconnErr) {
      console.error('[Keepalive] reconnect failed:', reconnErr);
    }
  }
}, 4 * 60 * 1000); // 4 минуты
const app = express();
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// Port MUST be 3000 for this environment
const PORT = 3212;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// S3 Client setup
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru',
  region: process.env.S3_REGION || 'ru-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true,
});

// SMTP Transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.timeweb.ru',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', 
  auth: {
    user: process.env.SMTP_USER || 'mail@dialogengine.ru',
    pass: process.env.SMTP_PASS,
  },
});

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// --- UTILS ---
async function trackActivity(type: 'message' | 'user') {
    const today = new Date();
    today.setHours(0,0,0,0);
    try {
        await prisma.dailyStats.upsert({
            where: { date: today },
            update: {
                messages: type === 'message' ? { increment: 1 } : undefined,
                users: type === 'user' ? { increment: 1 } : undefined
            },
            create: {
                date: today,
                messages: type === 'message' ? 1 : 0,
                users: type === 'user' ? 1 : 0
            }
        });
    } catch (e) { console.error('Stats tracking fail', e); }
}

async function seedStats() {
    const count = await prisma.dailyStats.count();
    if (count > 0) return;
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        await prisma.dailyStats.create({
            data: {
                date,
                messages: Math.floor(Math.random() * 50) + 10,
                users: Math.floor(Math.random() * 5) + 1
            }
        }).catch(() => {});
    }
}
seedStats();

// --- MIDDLEWARE ---
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    
    // Check if user is banned - Real-time enforcement
    try {
        const dbUser = await prisma.user.findUnique({ 
            where: { id: user.userId },
            select: { id: true, banStatus: true, banUntil: true, banReason: true, role: true, nickname: true }
        });
        
        if (!dbUser) return res.sendStatus(404);
        
        if (dbUser.banStatus === 'BANNED') {
            if (dbUser.banUntil && dbUser.banUntil < new Date()) {
                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { banStatus: 'NONE', banUntil: null, banReason: null }
                });
            } else {
                return res.status(403).json({ 
                    error: 'BANNED', 
                    reason: dbUser.banReason, 
                    until: dbUser.banUntil 
                });
            }
        }
        
        req.user = { ...user, role: dbUser.role, nickname: dbUser.nickname };
    } catch (e) {
        return res.sendStatus(500);
    }
    
    // Update lastSeen at most once every 5 minutes
    const lastUpdate = (global as any).lastSeenUpdates?.[user.userId] || 0;
    const now = Date.now();
    if (now - lastUpdate > 5 * 60 * 1000) {
        if (!(global as any).lastSeenUpdates) (global as any).lastSeenUpdates = {};
        (global as any).lastSeenUpdates[user.userId] = now;
        prisma.user.update({
            where: { id: user.userId },
            data: { lastSeen: new Date() }
        }).catch(e => console.error('LastSeen update fail', e));
    }

    next();
  });
};

const requireOwner = (req: any, res: any, next: any) => {
  if (req.user.role !== 'OWNER') return res.status(403).json({ error: 'Access denied' });
  next();
};

// --- API ROUTES ---

// Staff Management
app.get('/api/staff/subordinates', authenticateToken, async (req: any, res: any) => {
    try {
        const subordinates = await prisma.user.findMany({
            where: { managedById: req.user.userId },
            include: { stats: true }
        });
        res.json(subordinates);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/api/tasks', authenticateToken, async (req: any, res: any) => {
    try {
        const tasks = await prisma.task.findMany({
            where: { OR: [{ assigneeId: req.user.userId }, { creatorId: req.user.userId }] },
            include: { creator: true, assignee: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tasks);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/tasks', authenticateToken, async (req: any, res: any) => {
    const { title, description, assigneeId, deadline } = req.body;
    try {
        const task = await prisma.task.create({
            data: {
                title,
                description,
                assigneeId,
                creatorId: req.user.userId,
                deadline: deadline ? new Date(deadline) : null
            }
        });
        res.json(task);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/tasks/:id/status', authenticateToken, async (req: any, res: any) => {
    const { status } = req.body;
    try {
        const task = await prisma.task.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json(task);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/staff/create', authenticateToken, requireOwner, async (req: any, res: any) => {
  const { username, password, nickname, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        nickname,
        role: role as any,
        email: `${username}@soullink.staff`, 
      }
    });
    res.json(user);
  } catch (error) {
    console.error('Staff creation error:', error);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

// Tickets API
app.get('/api/tickets', authenticateToken, async (req: any, res: any) => {
    try {
        const { role, userId } = req.user;
        let where: any = {};
        if (role === 'USER') {
            where = { userId };
        } else if (role === 'OWNER') {
            where = {}; // Owners see all
        } else {
            where = { OR: [{ userId }, { managerId: userId }] };
        }
        
        const tickets = await prisma.ticket.findMany({
            where,
            include: { user: { select: { nickname: true, avatar: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickets);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/tickets', authenticateToken, async (req: any, res: any) => {
    const { subject, message } = req.body;
    try {
        const ticket = await prisma.ticket.create({
            data: {
                subject,
                userId: req.user.userId,
                messages: {
                    create: {
                        content: message,
                        senderId: req.user.userId
                    }
                }
            }
        });

        // Notify all owners/curators about new ticket
        try {
            const staffToNotify = await prisma.user.findMany({
                where: { role: { in: ['OWNER', 'CURATOR'] } },
                select: { id: true, telegramId: true }
            });
            const escapedNick = escapeHTML(req.user.nickname);
            const escapedSub = escapeHTML(subject);
            for (const s of staffToNotify) {
                if (s.telegramId) {
                    await sendTGNotification(s.id, `<b>🎫 НОВЫЙ ТИКЕТ</b>\n\nОт: ${escapedNick}\nТема: ${escapedSub}\n\n<a href="${process.env.APP_URL || '#'}">Nexus Panel</a>`, 'SYSTEM');
                }
            }
        } catch (e) {}

        res.json(ticket);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/api/tickets/:id/messages', authenticateToken, async (req: any, res: any) => {
    try {
        const messages = await prisma.ticketMessage.findMany({
            where: { ticketId: req.params.id },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/tickets/:id/messages', authenticateToken, async (req: any, res: any) => {
    const { content, mediaUrl, mediaType } = req.body;
    try {
        const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ error: 'Not found' });
        
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: req.params.id,
                senderId: req.user.userId,
                content,
                mediaUrl,
                mediaType: mediaType || 'text'
            }
        });
        
        // Auto-assign owner if staff replies
        if (['ADMIN', 'CURATOR', 'OWNER'].includes(req.user.role) && !ticket.managerId) {
            await prisma.ticket.update({
                where: { id: req.params.id },
                data: { managerId: req.user.userId }
            });
        }

        res.json(message);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.patch('/api/tickets/:id/status', authenticateToken, async (req: any, res: any) => {
    const { status } = req.body;
    try {
        const ticket = await prisma.ticket.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json(ticket);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Message Management (Edit / Delete / Reply)
app.patch('/api/messages/:id', authenticateToken, async (req: any, res: any) => {
    const { content } = req.body;
    try {
        const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
        if (!msg || msg.senderId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
        
        const updated = await prisma.message.update({
            where: { id: req.params.id },
            data: { content, isEdited: true }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/messages/:id', authenticateToken, async (req: any, res: any) => {
    try {
        const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
        if (!msg || (msg.senderId !== req.user.userId && req.user.role === 'USER')) return res.status(403).json({ error: 'Forbidden' });
        
        const updated = await prisma.message.update({
            where: { id: req.params.id },
            data: { isDeleted: true, content: 'Сообщение удалено', mediaUrl: null }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Curator / Owner: Subordinate Chats
app.get('/api/curator/subordinate-chats/:subId', authenticateToken, async (req: any, res: any) => {
    try {
        const sub = await prisma.user.findUnique({ where: { id: req.params.subId } });
        if (!sub || (sub.managedById !== req.user.userId && req.user.role !== 'OWNER')) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const messages = await prisma.message.findMany({
            where: { OR: [{ senderId: sub.id }, { receiverId: sub.id }] },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { nickname: true, avatar: true } },
                receiver: { select: { nickname: true, avatar: true } }
            }
        });
        res.json(messages);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Moderation Actions
app.post('/api/moderation/action', authenticateToken, async (req: any, res: any) => {
  if (req.user.role === 'USER') return res.sendStatus(403);
  const { userId, action } = req.body; // action: ban, unban, warn, mute
  
  try {
    let data: any = {};
    if (action === 'ban') data = { banStatus: 'BANNED' };
    if (action === 'unban') data = { banStatus: 'NONE' };
    if (action === 'warn') data = { warnCount: { increment: 1 } };
    
    const user = await prisma.user.update({
      where: { id: userId },
      data
    });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Moderation
app.get('/api/moderation/reports', authenticateToken, async (req: any, res: any) => {
  if (req.user.role === 'USER') return res.sendStatus(403);
  res.json([
    { id: '1', reason: 'Жалоба на спам', status: 'pending', createdAt: new Date() },
    { id: '2', reason: 'Некорректное поведение', status: 'pending', createdAt: new Date() }
  ]);
});

// 1. Upload to S3
app.post('/api/upload', authenticateToken, upload.single('file'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileKey = `${Date.now()}-${req.file.originalname}`;
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || 'soul-link',
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    });

    await s3.send(command);
    
    const url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${fileKey}`;
    res.json({ url });
  } catch (error) {
    console.error('S3 Upload error:', error);
    res.status(500).json({ error: 'Failed to upload to S3' });
  }
});

// 2. Request Registration Code
app.post('/api/auth/register-request', async (req, res) => {
  const { email } = req.body;
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationCode.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt },
    });

    // Send real email
    await transporter.sendMail({
      from: `"SoulLink Support" <${process.env.SMTP_USER || 'mail@dialogengine.ru'}>`,
      to: email,
      subject: 'Код подтверждения SoulLink',
      text: `Ваш код для регистрации: ${code}. Он действителен 10 минут.`,
    });

    res.json({ success: true, message: 'Код отправлен на почту' });
  } catch (error) {
    console.error('Code request error:', error);
    res.status(500).json({ error: 'Не удалось отправить код. Убедитесь, что SMTP пароль указан в .env' });
  }
});

// 3. Complete Registration
app.post('/api/auth/register-confirm', async (req, res) => {
  const { email, code, username, nickname, password } = req.body;
  try {
    const record = await prisma.verificationCode.findUnique({ where: { email } });
    if (!record || record.code !== code || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Неверный или просроченный код' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с такой почтой или никнеймом уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userCount = await prisma.user.count();

    const user = await prisma.user.create({
      data: {
        email,
        username,
        nickname,
        password: hashedPassword,
        role: userCount === 0 ? 'OWNER' : 'USER'
      }
    });

    await trackActivity('user');

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
    await prisma.verificationCode.delete({ where: { email } });
    
    res.json({ user, token });
  } catch (error) {
    console.error('Registration confirming error:', error);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

    // 4. Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    if (user.banStatus === 'BANNED') {
        if (user.banUntil && user.banUntil < new Date()) {
            await prisma.user.update({ where: { id: user.id }, data: { banStatus: 'NONE', banUntil: null, warnCount: 0 } });
        } else {
            return res.status(403).json({ 
                error: `Ваш аккаунт заблокирован.\nПричина: ${user.banReason || 'Не указана'}\n${user.banUntil ? 'До: ' + new Date(user.banUntil).toLocaleString() : 'Бессрочно'}` 
            });
        }
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);

    // Auto-create channel for staff if missing
    if (['ADMIN', 'CURATOR', 'OWNER'].includes(user.role)) {
        const channel = await prisma.channel.findUnique({ where: { ownerId: user.id } });
        if (!channel) {
            await prisma.channel.create({
                data: {
                    name: `Канал: ${user.nickname}`,
                    ownerId: user.id,
                    description: `Официальный блог: ${user.nickname}`
                }
            });
        }
    }

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// Bot Linking
app.get('/api/user/bot-link-token', authenticateToken, async (req: any, res: any) => {
    try {
        let user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.botAuthToken) {
            const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
            let token = '';
            for (let i = 0; i < 8; i++) {
                token += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            user = await prisma.user.update({
                where: { id: req.user.userId },
                data: { botAuthToken: token }
            });
        }
        res.json({ token: user?.botAuthToken });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/user/bot-link-token/refresh', authenticateToken, async (req: any, res: any) => {
    try {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let token = '';
        for (let i = 0; i < 8; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: { botAuthToken: token }
        });
        res.json({ token: user.botAuthToken });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/bot/link', async (req: any, res: any) => {
    const { token, telegramId } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    const cleanToken = token.trim().toUpperCase();
    try {
        const user = await prisma.user.findUnique({ where: { botAuthToken: cleanToken } });
        if (!user) {
            console.log(`Bot link failed: Token ${cleanToken} not found`);
            return res.status(404).json({ error: 'Token not found' });
        }
        
        const conflictingUser = await prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
        if (conflictingUser && conflictingUser.id !== user.id) {
            await prisma.user.update({
                where: { id: conflictingUser.id },
                data: { telegramId: null }
            });
        }
        
        await prisma.user.update({
            where: { id: user.id },
            data: { telegramId: String(telegramId), botAuthToken: null }
        });
        res.json({ success: true, nickname: user.nickname });
    } catch (e) { 
        console.error('Bot link internal error', e);
        res.status(500).json({ error: 'Failed' }); 
    }
});

// 5. Update Profile
app.patch('/api/users/profile', authenticateToken, async (req: any, res: any) => {
  const { nickname, avatar, theme, description, banner, isOnRest, wallpaper } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { nickname, avatar, theme, description, banner, isOnRest, wallpaper } as any,
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

async function getSystemUserId() {
  const sys = await prisma.user.findFirst({ where: { username: 'SYSTEM' } });
  if (sys) return sys.id;
  // Fallback but try to create it if it doesn't exist
  try {
      const created = await prisma.user.create({
          data: {
              id: 'SYSTEM',
              email: 'system@team.local',
              username: 'SYSTEM',
              nickname: 'Команда Поддержки',
              password: 'prevent_login_' + Math.random(),
              role: 'OWNER',
          }
      });
      return created.id;
  } catch (e) {
      return 'SYSTEM'; // Final fallback
  }
}

function escapeHTML(str: string) {
    return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m] || m));
}

async function sendTGNotification(recipientId: string, text: string, sourceId: string = 'SYSTEM', mediaUrl?: string) {
    const maxRetries = 2;
    let attempt = 0;

    const executeRequest = async (): Promise<any> => {
        try {
            const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
            if (!recipient?.telegramId) return;

            const isMandatory = sourceId === 'SYSTEM' || sourceId === 'BROADCAST' || sourceId.startsWith('TICKET_');
            if (!isMandatory) {
                const allowedList = recipient.tgAllowedChats || [];
                if (!recipient.tgNotifyAll && !allowedList.includes(sourceId)) {
                    return;
                }
            }

            const token = process.env.TELEGRAM_BOT_TOKEN;
            if (!token) return;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

            let response;
            if (mediaUrl) {
                const formData = new FormData();
                formData.append('chat_id', recipient.telegramId);
                formData.append('parse_mode', 'HTML');
                const mediaPrefix = '🖼 [МЕДИА]\n\n';
                formData.append('caption', mediaPrefix + text);
                
                try {
                    const mediaRes = await fetch(mediaUrl, { signal: AbortSignal.timeout(10000) });
                    if (mediaRes.ok) {
                        const blob = await mediaRes.blob();
                        formData.append('photo', blob, 'media.jpg');
                    } else {
                        // If download fails, we strictly avoid sending the URL as photo to avoid exposure
                        // We will instead let it fall back to sendMessage in the outer catch/check
                        throw new Error('Media download failed');
                    }
                } catch (fetchErr) {
                    // Re-throw so it goes to fallback or next attempt
                    throw fetchErr;
                }

                response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
            } else {
                response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: recipient.telegramId,
                        text: text,
                        parse_mode: 'HTML'
                    }),
                    signal: controller.signal
                });
            }
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                const err = await response.json();
                if (err.description?.includes('can\'t parse entities') || (mediaUrl && !err.ok)) {
                     const fallbackBody = {
                        chat_id: recipient.telegramId,
                        text: (mediaUrl ? '[🖼 МЕДИА]\n' : '') + text.replace(/<[^>]*>/g, ''), 
                     };
                     await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(fallbackBody)
                    });
                } else if (response.status === 429) {
                    console.error('Telegram Rate Limited (429)');
                } else {
                    console.error('Telegram API Error:', err.description, 'Source:', sourceId);
                }
            }
        } catch (e: any) {
            const isTimeout = e.name === 'AbortError' || e.message?.includes('timeout');
            console.error(`TG notify attempt ${attempt + 1} failed:`, isTimeout ? 'Timeout' : e.message, 'Source:', sourceId);
            
            if (attempt < maxRetries) {
                attempt++;
                const delay = attempt * (isTimeout ? 3000 : 1500);
                await new Promise(r => setTimeout(r, delay));
                return executeRequest();
            }
        }
    };

    return executeRequest();
}

async function notifyExternalBot(message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = "-1002334814885"; // Admin group
    if (!token) return;
    
    const maxRetries = 2;
    let attempt = 0;

    const executeRequest = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: adminChatId,
                    text: message,
                    parse_mode: 'HTML'
                }),
                signal: controller.signal,
                keepalive: true
            });
            clearTimeout(timeout);

            if (!res.ok) {
                const err = await res.json();
                if (err.description?.includes('can\'t parse entities')) {
                     await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: adminChatId,
                            text: message.replace(/<[^>]*>/g, ''),
                        })
                    });
                }
            }
        } catch (e: any) {
            console.error(`External bot notify attempt ${attempt + 1} failed:`, e.message);
            if (attempt < maxRetries) {
                attempt++;
                await new Promise(r => setTimeout(r, attempt * 1000));
                return executeRequest();
            }
        }
    };

    return executeRequest();
}

app.post('/api/user/tg-settings', authenticateToken, async (req: any, res: any) => {
    const { tgNotifyAll, tgAllowedChats } = req.body;
    try {
        const updated = await prisma.user.update({
            where: { id: req.user.userId },
            data: { 
                tgNotifyAll: tgNotifyAll ?? undefined,
                tgAllowedChats: tgAllowedChats ?? undefined
            }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Toggle Rest Mode
app.post('/api/users/toggle-rest', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { isOnRest: !(user as any)?.isOnRest } as any
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// 5.1 Get User Profile (for chat modal / settings)
app.get('/api/users/profile/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        nickname: true, 
        avatar: true, 
        description: true, 
        role: true, 
        banner: true,
        wallpaper: true,
        isOnRest: true,
        stats: true, 
        reviews: { 
            include: { user: { select: { nickname: true, avatar: true } } }, 
            orderBy: { createdAt: 'desc' } 
        } 
      } as any
    });

    if (user) {
        // Calculate unread messages
        const unreadCount = await prisma.message.count({
            where: { receiverId: userId, read: false }
        });
        (user as any).unreadCount = unreadCount;

        // Statistics based on role
        if (user.role === 'USER') {
            const givenReviews = await prisma.review.findMany({ where: { userId } });
            const avg = givenReviews.length > 0 ? (givenReviews.reduce((a, b) => a + b.rating, 0) / givenReviews.length) : 0;
            (user as any).reviewsCount = givenReviews.length;
            (user as any).writtenReviewsCount = givenReviews.length;
            (user as any).averageRatingGiven = avg;
        } else {
            const reviewsReceived = await prisma.review.count({
                where: { adminId: userId }
            });
            (user as any).reviewsCount = reviewsReceived;
            (user as any).receivedReviewsCount = reviewsReceived;
        }
    }

    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

// 6. User info
app.get('/api/users/me', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { stats: true }
    });
    if (user) {
        if (user.role === 'USER') {
            const count = await prisma.review.count({ where: { userId: user.id } });
            (user as any).reviewsCount = count;
            (user as any).givenReviewsCount = count;
            (user as any).writtenReviewsCount = count;
        } else {
            const count = await prisma.review.count({ where: { adminId: user.id } });
            (user as any).reviewsCount = count;
            (user as any).receivedReviewsCount = count;
        }
    }
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// 7. Chats list
app.get('/api/chats', authenticateToken, async (req: any, res: any) => {
  const userId = req.user.userId;
  try {
    const messages = await prisma.message.findMany({
      where: { 
        OR: [{ senderId: userId }, { receiverId: userId }],
        NOT: { senderId: 'SYSTEM', receiverId: userId, content: { startsWith: 'Тикет #' } } // Filter out ticket meta-messages if needed
      },
      orderBy: { createdAt: 'desc' },
    });

    const chatPartnersIds = Array.from(new Set(
      messages.map(m => m.senderId === userId ? m.receiverId : m.senderId)
    ));

    const partners = await prisma.user.findMany({
      where: { id: { in: chatPartnersIds }, username: { not: 'SYSTEM' } },
      select: { id: true, nickname: true, avatar: true, isOnRest: true }
    });

    const chats = partners.map(partner => {
      const lastMsg = messages.find(m => m.senderId === partner.id || m.receiverId === partner.id);
      return {
        id: partner.id,
        name: partner.nickname,
        avatar: partner.avatar || `https://i.pravatar.cc/150?u=${partner.id}`,
        lastMsg: lastMsg?.content || (lastMsg?.mediaType === 'voice' ? 'Голосовое сообщение' : 'Медиа'),
        time: lastMsg?.createdAt || new Date(),
        unread: messages.filter(m => m.receiverId === userId && m.senderId === partner.id && !m.read).length,
        isOnRest: (partner as any).isOnRest,
        type: 'chat'
      };
    });

    // Add Tickets
    const tickets = await prisma.ticket.findMany({
        where: req.user.role === 'USER' 
            ? { userId, status: 'open' } 
            : { 
                OR: [
                    { managerId: userId },
                    { managerId: null }
                ],
                status: 'open'
            },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 }, user: true },
        orderBy: { updatedAt: 'desc' }
    });

    const ticketChats = tickets.map(t => ({
        id: `TICKET_${t.id}`,
        name: `Тикет #${t.id.slice(0, 4)}`,
        avatar: 'https://cdn-icons-png.flaticon.com/512/1067/1067562.png',
        lastMsg: t.messages[0]?.content || t.subject,
        time: t.updatedAt,
        unread: 0,
        isOnRest: false,
        type: 'ticket'
    }));

    // Add Technical Support Chat (System)
    const systemUser = await prisma.user.findUnique({ where: { username: 'SYSTEM' } });
    const techMsg = messages.find(m => m.senderId === systemUser?.id || m.receiverId === systemUser?.id);
    const techChat = {
        id: 'SYSTEM',
        name: 'SoulLink Notifications',
        avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712139.png',
        lastMsg: techMsg?.content || 'Системные уведомления и новости',
        time: techMsg?.createdAt || new Date(),
        unread: systemUser ? messages.filter(m => m.receiverId === userId && m.senderId === systemUser.id && !m.read).length : 0,
        isPinned: true,
        type: 'system'
    };

    const allChats = [techChat, ...ticketChats, ...chats];
    allChats.sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    res.json(allChats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// 8. Messages history
app.get('/api/messages/:otherId', authenticateToken, async (req: any, res: any) => {
  let { otherId } = req.params;
  const userId = req.user.userId;
  try {
    if (otherId.startsWith('TICKET_')) {
        const ticketId = otherId.split('_')[1];
        const messages = await prisma.ticketMessage.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { nickname: true, avatar: true, role: true } } }
        });
        // Map to standard message format
        return res.json(messages.map(m => ({
            id: m.id,
            content: m.content,
            senderId: m.senderId,
            receiverId: otherId,
            mediaUrl: m.mediaUrl,
            mediaType: m.mediaType,
            createdAt: m.createdAt,
            read: true
        })));
    }

    if (otherId === 'SYSTEM') {
        const sys = await prisma.user.findUnique({ where: { username: 'SYSTEM' } });
        if (sys) otherId = sys.id;
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherId },
          { senderId: otherId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    // Mark as read
    await prisma.message.updateMany({
      where: { senderId: otherId, receiverId: userId, read: false },
      data: { read: true }
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 9. Send message
app.post('/api/messages', authenticateToken, async (req: any, res: any) => {
  let { receiverId, content, mediaUrl, mediaType, replyToId } = req.body;
  const userId = req.user.userId;
  try {
    if (receiverId.startsWith('TICKET_')) {
        const ticketId = receiverId.split('_')[1];
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId,
                senderId: userId,
                content,
                mediaUrl,
                mediaType: mediaType || 'text'
            }
        });
        await prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
        return res.json({ ...message, receiverId });
    }

    if (receiverId === 'SYSTEM') {
        if (req.user.role === 'USER') {
            return res.status(403).json({ error: 'SYSTEM chat is read-only. Create a ticket for support.' });
        }
        const sys = await prisma.user.findUnique({ where: { username: 'SYSTEM' } });
        if (sys) receiverId = sys.id;
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.userId,
        receiverId,
        content: content || '',
        mediaUrl,
        mediaType,
        replyToId
      },
      include: {
        sender: { select: { nickname: true } }
      }
    });

    const escapedContent = escapeHTML(content || '');
    const msg = `<b>💬 НОВОЕ СООБЩЕНИЕ</b>\n\nОт: ${escapeHTML(message.sender.nickname)}\n\n${escapedContent.substring(0, 200)}${escapedContent.length > 200 ? '...' : ''}`;
    await sendTGNotification(receiverId, msg, userId, mediaUrl || undefined);

    await trackActivity('message');

    // Update dialogs count for stats
    const existingChat = await prisma.message.findFirst({
        where: {
            OR: [
                { senderId: userId, receiverId },
                { senderId: receiverId, receiverId: userId }
            ],
            NOT: { id: message.id }
        }
    });

    if (!existingChat) {
        await prisma.userStats.upsert({
            where: { userId: userId },
            update: { dialogsCount: { increment: 1 } },
            create: { userId: userId, dialogsCount: 1 }
        });
        if (receiverId !== 'SYSTEM' && !receiverId.startsWith('TICKET_')) {
            await prisma.userStats.upsert({
                where: { userId: receiverId },
                update: { dialogsCount: { increment: 1 } },
                create: { userId: receiverId, dialogsCount: 1 }
            });
        }
    }

    await prisma.userStats.upsert({
      where: { userId: req.user.userId },
      update: { messagesSent: { increment: 1 } },
      create: { userId: req.user.userId, messagesSent: 1 }
    });

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// 10. Staff and Stats for Dashboards
app.get('/api/staff', authenticateToken, async (req: any, res: any) => {
  try {
    const admins = await prisma.user.findMany({
      where: { OR: [{ role: 'ADMIN' }, { role: 'CURATOR' }, { role: 'OWNER' }] },
      include: { stats: true },
    });
    res.json(admins);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/stats/system', authenticateToken, async (req: any, res: any) => {
  try {
    if (req.user.role === 'OWNER') {
      const totalUsers = await prisma.user.count();
      const totalMessages = await prisma.message.count();
      const bannedUsers = await prisma.user.count({ where: { banStatus: 'BANNED' } });
      
      const activity = await prisma.dailyStats.findMany({
          orderBy: { date: 'desc' },
          take: 10
      });
      
      const botUsersCount = await prisma.user.count({ where: { telegramId: { not: null } } });

      const systemUser = await prisma.user.findUnique({ where: { username: 'SYSTEM' } });
      const systemId = systemUser?.id || 'SYSTEM';

      // Robust dialog count: unique pairs of (user1, user2) excluding SYSTEM/TICKET
      const chats = await prisma.message.findMany({
          select: { senderId: true, receiverId: true },
          where: {
              NOT: {
                  OR: [
                      { senderId: systemId },
                      { receiverId: systemId },
                      { senderId: 'SYSTEM' },
                      { receiverId: 'SYSTEM' },
                      { receiverId: { startsWith: 'TICKET_' } }
                  ]
              }
          }
      });
      const pairs = new Set();
      chats.forEach(c => {
          const pair = [c.senderId, c.receiverId].sort().join(':');
          pairs.add(pair);
      });

      return res.json({ 
          totalUsers, 
          totalMessages, 
          bannedUsers, 
          botUsersCount,
          totalReviews: await prisma.review.count(),
          totalDialogs: pairs.size,
          dailyStats: activity.reverse().map(s => s.messages)
      });
    }
    
    // Admins see only their stats
    const userStats = await prisma.userStats.findUnique({ where: { userId: req.user.userId } });
    
    let dialogsCount = userStats?.dialogsCount || 0;
    if (dialogsCount === 0) {
        const systemUser = await prisma.user.findUnique({ where: { username: 'SYSTEM' } });
        const systemId = systemUser?.id || 'SYSTEM';

        const userChats = await prisma.message.findMany({
            select: { senderId: true, receiverId: true },
            where: { 
                OR: [{ senderId: req.user.userId }, { receiverId: req.user.userId }],
                NOT: {
                    OR: [
                        { senderId: systemId },
                        { receiverId: systemId },
                        { senderId: 'SYSTEM' },
                        { receiverId: 'SYSTEM' },
                        { receiverId: { startsWith: 'TICKET_' } }
                    ]
                }
            }
        });
        const pairs = new Set();
        userChats.forEach(c => {
            const other = c.senderId === req.user.userId ? c.receiverId : c.senderId;
            if (other !== systemId && other !== 'SYSTEM') {
                pairs.add(other);
            }
        });
        dialogsCount = pairs.size;
    }

    res.json({ 
      personal: true,
      messagesSent: userStats?.messagesSent || 0,
      averageRating: userStats?.averageRating || 0,
      dialogsCount
    });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// Owner: All Chats View
app.get('/api/admin/all-chats', authenticateToken, requireOwner, async (req: any, res: any) => {
  try {
    const chats = await prisma.message.findMany({
      distinct: ['senderId', 'receiverId'],
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { nickname: true, avatar: true } },
        receiver: { select: { nickname: true, avatar: true } }
      }
    });
    res.json(chats);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch all chats' });
  }
});

// Channels and Posts API
app.get('/api/channels', authenticateToken, async (req: any, res: any) => {
  try {
    const channels = await prisma.channel.findMany({
      include: { 
        owner: { select: { nickname: true, avatar: true } },
        _count: { select: { subscribers: true, posts: true } },
        subscribers: { where: { userId: req.user.userId } }
      }
    });

    const results = channels.map(ch => ({
        ...ch,
        isSubscribed: ch.subscribers.length > 0
    }));

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/posts', authenticateToken, async (req: any, res: any) => {
  const { channelId } = req.query;
  try {
    const posts = await prisma.post.findMany({
      where: channelId ? { channelId: String(channelId) } : {},
      include: {
        _count: { select: { reactions: true, comments: true } },
        reactions: { where: { userId: req.user.userId } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/posts/:id/react', authenticateToken, async (req: any, res: any) => {
    try {
        const existing = await prisma.postReaction.findUnique({
            where: {
                userId_postId_type: {
                    userId: req.user.userId,
                    postId: req.params.id,
                    type: 'like'
                }
            }
        });

        if (existing) {
            await prisma.postReaction.delete({
                where: { id: existing.id }
            });
            return res.json({ removed: true });
        }

        const reaction = await prisma.postReaction.create({
            data: {
                userId: req.user.userId,
                postId: req.params.id,
                type: 'like'
            }
        });
        res.json(reaction);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/api/posts/:id/comments', authenticateToken, async (req: any, res: any) => {
    try {
        const comments = await prisma.postComment.findMany({
            where: { postId: req.params.id },
            include: { user: { select: { nickname: true, avatar: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(comments);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/posts/:id/comments', authenticateToken, async (req: any, res: any) => {
    const { content, replyToId } = req.body;
    try {
        const comment = await prisma.postComment.create({
            data: {
                content,
                userId: req.user.userId,
                postId: req.params.id,
                replyToId
            },
            include: { user: { select: { nickname: true, avatar: true } } }
        });
        res.json(comment);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/posts/comments/:id', authenticateToken, async (req: any, res: any) => {
    try {
        const comment = await prisma.postComment.findUnique({ where: { id: req.params.id } });
        if (!comment || (comment.userId !== req.user.userId && req.user.role === 'USER')) return res.status(403).json({ error: 'Forbidden' });
        
        await prisma.postComment.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/posts/:id', authenticateToken, async (req: any, res: any) => {
    try {
        const post = await prisma.post.findUnique({ 
            where: { id: req.params.id },
            include: { channel: true }
        });
        if (!post || (post.channel.ownerId !== req.user.userId && req.user.role === 'USER')) return res.status(403).json({ error: 'Forbidden' });
        
        await prisma.post.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/posts', authenticateToken, async (req: any, res: any) => {
  const { channelId, content, mediaUrl } = req.body;
  try {
    // Check if user owns this channel
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.ownerId !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const post = await prisma.post.create({
      data: { content, mediaUrl, channelId }
    });

    // Notify subscribers via TG
    try {
        const subscribers = await prisma.subscription.findMany({
            where: { channelId },
            include: { user: { select: { id: true, telegramId: true, tgNotifyAll: true, tgAllowedChats: true } } }
        });
        
        const channelSourceId = `CHANNEL_${channelId}`;
        const escapedName = escapeHTML(channel.name);
        const postContent = content || '';
        const escapedContent = escapeHTML(postContent);

        const batchSize = 25;
        for (let i = 0; i < subscribers.length; i += batchSize) {
            const batch = subscribers.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(async (sub) => {
                if (sub.user.telegramId) {
                    const allowedList = sub.user.tgAllowedChats || [];
                    const wantsNotify = sub.user.tgNotifyAll || allowedList.includes(channelSourceId);
                    if (wantsNotify) {
                        let msg = `<b>📢 НОВЫЙ ПОСТ: ${escapedName}</b>\n\n`;
                        msg += `${escapedContent.substring(0, 300)}${postContent.length > 300 ? '...' : ''}\n\n`;
                        msg += `<a href="${process.env.APP_URL || '#'}">Открыть канал</a>`;
                        
                        await sendTGNotification(sub.user.id, msg, channelSourceId, mediaUrl || undefined);
                    }
                }
            }));
            if (i + batchSize < subscribers.length) {
                await new Promise(r => setTimeout(r, 600));
            }
        }
    } catch (e) {
        // console.error('Channel notify failed', e);
    }

    notifyExternalBot(`<b>📢 NEW POST</b>\nChannel: ${channel.name}\n${mediaUrl ? '🖼 [Media Included]\n' : ''}Content: ${(content || '').substring(0, 50)}${(content || '').length > 50 ? '...' : ''}\n<a href="${process.env.APP_URL || '#'}">Открыть приложение</a>`);

    res.json(post);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/channels/:id', authenticateToken, async (req: any, res: any) => {
    const { name, description, avatar, banner } = req.body;
    try {
        const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
        if (!channel || channel.ownerId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
        
        const updated = await prisma.channel.update({
            where: { id: req.params.id },
            data: { name, description, avatar, banner }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/channels/subscribe/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const existing = await prisma.subscription.findUnique({
      where: {
        userId_channelId: {
          userId: req.user.userId,
          channelId: req.params.id
        }
      }
    });
    if (existing) {
        await prisma.subscription.delete({ where: { id: existing.id } });
        return res.json({ success: true, unsubscribed: true });
    }

    const sub = await prisma.subscription.create({
      data: { userId: req.user.userId, channelId: req.params.id }
    });
    res.json(sub);
  } catch (e) {
    res.status(400).json({ error: 'Failed to subscribe' });
  }
});

// --- GAME SESSION API ---
app.post('/api/games/create', authenticateToken, async (req: any, res: any) => {
    const { type, partnerId } = req.body;
    try {
        const partnerUser = await prisma.user.findUnique({ where: { id: partnerId } });
        if (!partnerUser) return res.status(404).json({ error: 'User not found' });

        const initialState: any = {};
        if (type === 'words') {
             initialState.state = { 
                 words: [], 
                 turn: partnerId,
                 players: [
                    { id: req.user.userId, nickname: req.user.nickname },
                    { id: partnerId, nickname: partnerUser.nickname }
                 ]
             };
        }
        else if (type === 'chess') initialState.state = { 
            fen: 'start', 
            turn: 'white',
            // whiteId/blackId — источник истины для определения цвета.
            // Не зависит от порядка массива players или JWT-декодирования.
            whiteId: req.user.userId,
            blackId: partnerId,
            players: [
                { id: req.user.userId, nickname: req.user.nickname },
                { id: partnerId, nickname: partnerUser.nickname }
            ]
        };
        else if (type === 'seabattle' || type === 'checkers') {
            initialState.state = { 
                turn: 'white',
                players: [
                    { id: req.user.userId, nickname: req.user.nickname, ships: [], shots: [], ready: false },
                    { id: partnerId, nickname: partnerUser.nickname, ships: [], shots: [], ready: false }
                ]
            };
        }

        const session = await prisma.gameSession.create({
            data: {
                type,
                players: { connect: [{ id: req.user.userId }, { id: partnerId }] },
                state: initialState.state
            },
            include: { players: { select: { id: true, nickname: true, avatar: true } } }
        });

        // Send invite message
        await prisma.message.create({
            data: {
                senderId: req.user.userId,
                receiverId: partnerId,
                content: session.id,
                mediaType: 'game_invite',
                mediaUrl: type
            }
        });

        res.json(session);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create game' });
    }
});

app.get('/api/games/:id', authenticateToken, async (req: any, res: any) => {
    try {
        const session = await prisma.gameSession.findUnique({
            where: { id: req.params.id },
            include: { players: { select: { id: true, nickname: true, avatar: true } } }
        });
        if (!session) return res.status(404).json({ error: 'Game not found' });

        const st = session.state as any;
        const uid = req.user.userId;

        // Определяем цвет через whiteId/blackId — прямое сравнение строк,
        // никакого findIndex, никакой зависимости от порядка массива.
        let myColor: 'w' | 'b' | null = null;
        let myPlayerIndex = -1;

        if (st?.whiteId && st?.blackId) {
            // Новые игры: явные поля whiteId/blackId
            if (st.whiteId === uid)      { myColor = 'w'; myPlayerIndex = 0; }
            else if (st.blackId === uid) { myColor = 'b'; myPlayerIndex = 1; }
        } else {
            // Старые игры: fallback на players[]-массив из state
            const statePlayers: { id: string }[] = Array.isArray(st?.players) ? st.players : [];
            const idx = statePlayers.findIndex((p: any) => p.id === uid);
            if (idx !== -1) {
                myColor = idx === 0 ? 'w' : 'b';
                myPlayerIndex = idx;
            } else {
                // Последний fallback: Prisma relation (порядок не гарантирован, но лучше чем ничего)
                const prismaIdx = (session.players as any[]).findIndex((p: any) => p.id === uid);
                if (prismaIdx !== -1) {
                    myColor = prismaIdx === 0 ? 'w' : 'b';
                    myPlayerIndex = prismaIdx;
                }
            }
        }

        console.log(`[GET /api/games/${session.id}] uid=${uid} whiteId=${st?.whiteId} blackId=${st?.blackId} → myColor=${myColor}`);
        res.json({ ...session, myColor, myPlayerIndex });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch game' });
    }
});

app.post('/api/games/:id/move', authenticateToken, async (req: any, res: any) => {
    const { state, move } = req.body;
    try {
        // Prisma не поддерживает { push } для JSON-полей — только для scalar list.
        // Читаем текущую историю и вручную добавляем новый ход.
        let newHistory: any[] | undefined;
        if (move) {
            const current = await prisma.gameSession.findUnique({
                where: { id: req.params.id },
                select: { history: true }
            });
            const prevHistory = Array.isArray(current?.history) ? current.history : [];
            newHistory = [...prevHistory, move];
        }

        const session = await prisma.gameSession.update({
            where: { id: req.params.id },
            data: {
                state,
                ...(newHistory !== undefined ? { history: newHistory } : {})
            }
        });
        res.json(session);
    } catch (e) {
        console.error('Game move error:', e);
        res.status(500).json({ error: 'Failed to update game' });
    }
});

// Moderation API
app.post('/api/moderation/warn', authenticateToken, async (req: any, res: any) => {
    const { targetUserId, reason } = req.body;
    if (!['ADMIN', 'CURATOR', 'OWNER'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });

    try {
        const user = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const newWarnings = (user.warnCount || 0) + 1;
        let banStatus = user.banStatus;
        let banReason = user.banReason;
        let banUntil = user.banUntil;

        if (newWarnings >= 3) {
            banStatus = 'BANNED';
            banReason = 'Автоматическая блокировка за 3 нарушения';
            banUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ban
        }

        const sysId = await getSystemUserId();
        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { 
                warnCount: newWarnings % 3 === 0 ? 0 : newWarnings, 
                banStatus,
                banReason,
                banUntil: banUntil || undefined
            }
        });

        const msgContent = `⚠️ ПРЕДУПРЕЖДЕНИЕ: ${reason}\n\nНарушений: ${newWarnings}/3.\n${newWarnings >= 3 ? 'Вы автоматически заблокированы на 7 дней за систематические нарушения.' : ''}`;
        
        await prisma.message.create({
            data: {
                senderId: sysId,
                receiverId: targetUserId,
                content: msgContent
            }
        });

        await sendTGNotification(targetUserId, `<b>${newWarnings >= 3 ? '🚫 BLOCK' : '⚠️ WARN'}</b>\n\n${msgContent}`);

        res.json({ success: true, warnings: newWarnings });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/moderation/ban', authenticateToken, async (req: any, res: any) => {
    const { targetUserId, reason, durationHours } = req.body;
    if (!['ADMIN', 'CURATOR', 'OWNER'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });

    try {
        const banUntil = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;
        await prisma.user.update({
            where: { id: targetUserId },
            data: { banStatus: 'BANNED', banReason: reason, banUntil }
        });

        const sysId = await getSystemUserId();
        const msgContent = `🚫 БЛОКИРОВКА: ${reason}\n\nСрок: ${durationHours ? durationHours + ' ч.' : 'Бессрочно'}`;
        await prisma.message.create({
            data: {
                senderId: sysId,
                receiverId: targetUserId,
                content: msgContent
            }
        });

        await sendTGNotification(targetUserId, `<b>🚫 БЛОКИРОВКА</b>\n\n${msgContent}`);

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/moderation/unban', authenticateToken, async (req: any, res: any) => {
    const { targetUserId } = req.body;
    if (!['ADMIN', 'CURATOR', 'OWNER'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    try {
        await prisma.user.update({ where: { id: targetUserId }, data: { banStatus: 'NONE', banUntil: null, warnCount: 0 } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Curator API
app.get('/api/curator/subordinate-chats/:subId', authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'CURATOR' && req.user.role !== 'OWNER') return res.status(403).json({ error: 'Access denied' });
    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: req.params.subId },
                    { receiverId: req.params.subId }
                ]
            },
            include: { sender: { select: { nickname: true, avatar: true } }, receiver: { select: { nickname: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(messages);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.post('/api/staff/assign', authenticateToken, requireOwner, async (req: any, res: any) => {
    const { subordinateId, managerId } = req.body;
    try {
        await prisma.user.update({
            where: { id: subordinateId },
            data: { managedById: managerId }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/api/moderation/reports', authenticateToken, requireOwner, async (req: any, res: any) => {
    try {
        const reports = await prisma.report.findMany({
            include: { reporter: true, target: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/all-chats', authenticateToken, requireOwner, async (req: any, res: any) => {
    try {
        const messages = await prisma.message.findMany({
            include: { sender: true, receiver: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(messages);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/sanctions', authenticateToken, requireOwner, async (req: any, res: any) => {
    const { targetId, action, reason, durationHours } = req.body;
    const targetUser = await prisma.user.findFirst({
        where: { OR: [{ id: targetId }, { username: targetId }] }
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    try {
        const sysId = await getSystemUserId();
        if (action === 'ban') {
            const until = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;
            await prisma.user.update({
                where: { id: targetUser.id },
                data: { banStatus: 'BANNED', banReason: reason, banUntil: until }
            });
            const durationText = durationHours ? `${durationHours} ч.` : 'Перманентно';
            const msg = `🔴 БАН: Ваши права доступа ограничены администратором.\n\nПричина: ${reason || 'не указана'}\nСрок: ${durationText}`;
            await prisma.message.create({
                data: { senderId: sysId, receiverId: targetUser.id, content: msg }
            });
            await sendTGNotification(targetUser.id, `<b>🚫 БАН</b>\n\n${msg}`);

        } else if (action === 'unban') {
            await prisma.user.update({
                where: { id: targetUser.id },
                data: { banStatus: 'NONE', banReason: null, banUntil: null, warnCount: 0 }
            });
            const msg = `🟢 РАЗБЛОКИРОВКА: Ваши права доступа восстановлены. Пожалуйста, соблюдайте правила.`;
            await prisma.message.create({
                data: { senderId: sysId, receiverId: targetUser.id, content: msg }
            });
            await sendTGNotification(targetUser.id, `<b>✅ UNBAN</b>\n\n${msg}`);

        } else if (action === 'warn') {
            const newWarnings = (targetUser.warnCount || 0) + 1;
            let banStatus = targetUser.banStatus;
            let banReason = targetUser.banReason;
            let banUntil = targetUser.banUntil;

            if (newWarnings >= 3) {
                banStatus = 'BANNED';
                banReason = 'Автоматическая блокировка за 3 нарушения';
                banUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for auto ban
            }

            await prisma.user.update({
                where: { id: targetUser.id },
                data: { 
                    warnCount: newWarnings % 3 === 0 ? 0 : newWarnings,
                    banStatus,
                    banReason,
                    banUntil: banUntil || undefined
                }
            });

            const msg = `⚠️ ПРЕДУПРЕЖДЕНИЕ: ${reason || 'за нарушение правил'}\n\nНарушений: ${newWarnings}/3.\n${newWarnings >= 3 ? 'Вы автоматически заблокированы на 24 часа.' : ''}`;
            await prisma.message.create({
                data: { senderId: sysId, receiverId: targetUser.id, content: msg }
            });
            await sendTGNotification(targetUser.id, `<b>${newWarnings >= 3 ? '🚫 BLOCK' : '⚠️ WARN'}</b>\n\n${msg}`);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Broadcast - Global mailing to SYSTEM chat
app.post('/api/broadcast/send', authenticateToken, requireOwner, async (req: any, res: any) => {
  const { title, content } = req.body;
  try {
    const systemUser = await prisma.user.findUnique({ where: { username: 'SYSTEM' } });
    if (!systemUser) return res.status(500).json({ error: 'System user not initialized' });

    const users = await prisma.user.findMany({ 
        where: { username: { not: 'SYSTEM' } },
        select: { id: true } 
    });
    
    // Batch processing to prevent timeout
    const batchSize = 30; // Reduced batch size
    const sysId = await getSystemUserId();
    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(async (u) => {
            try {
                const escapedContent = escapeHTML(content);
                await sendTGNotification(u.id, `<b>📢 ОБЩАЯ РАССЫЛКА</b>\n\n${escapedContent}`, 'BROADCAST');
                await prisma.message.create({
                    data: {
                        senderId: sysId,
                        receiverId: u.id,
                        content: `[РАССЫЛКА: ${title}]\n${content}`,
                        mediaType: 'text'
                    }
                });
            } catch (innerE) {
                console.error(`Broadcast failed for user ${u.id}:`, innerE);
            }
        }));
        
        // Brief pause between batches
        if (i + batchSize < users.length) {
            await new Promise(r => setTimeout(r, 800));
        }
    }
    
    res.json({ success: true, processed: users.length });
  } catch (e) {
    console.error('Broadcast failed:', e);
    res.status(500).json({ error: 'Failed to broadcast' });
  }
});

// All reviews
app.get('/api/reviews/all', authenticateToken, async (req: any, res: any) => {
  const { adminId } = req.query;
  try {
    const reviews = await prisma.review.findMany({
      where: adminId ? { adminId: String(adminId) } : {},
      include: {
        user: { select: { nickname: true, avatar: true } },
        admin: { select: { nickname: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/reviews/:id/comments', authenticateToken, async (req: any, res: any) => {
    const { content, replyToId } = req.body;
    try {
        const comment = await prisma.reviewComment.create({
            data: {
                content,
                userId: req.user.userId,
                reviewId: req.params.id,
                replyToId
            },
            include: { user: { select: { nickname: true, avatar: true } } }
        });
        res.json(comment);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/api/reviews/:id/comments', authenticateToken, async (req: any, res: any) => {
    try {
        const comments = await prisma.reviewComment.findMany({
            where: { reviewId: req.params.id },
            include: { user: { select: { nickname: true, avatar: true } } },
            orderBy: { createdAt: 'asc' }
        });
        res.json(comments);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/api/admins', authenticateToken, async (req: any, res: any) => {
  try {
    const admins = await prisma.user.findMany({
      where: { 
          role: { in: ['ADMIN', 'CURATOR', 'OWNER'] }, 
          isOnRest: false,
          banStatus: 'NONE',
          username: { not: 'SYSTEM' }
      },
      include: { stats: true },
    });
    res.json(admins);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// All reviews with filtering
app.get('/api/reviews/all', authenticateToken, async (req: any, res: any) => {
  const { adminId } = req.query;
  try {
    const reviews = await prisma.review.findMany({
      where: adminId ? { adminId } : {},
      include: { 
        user: { select: { nickname: true, avatar: true } },
        admin: { select: { nickname: true, username: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/reviews', authenticateToken, async (req: any, res: any) => {
  const { adminId, rating, comment, mediaUrl } = req.body;
  try {
    const review = await prisma.review.create({
      data: { 
        adminId, 
        userId: req.user.userId, 
        rating, 
        comment: comment || '',
        mediaUrl
      },
    });
    const all = await prisma.review.findMany({ where: { adminId } });
    const avg = all.reduce((a, b) => a + b.rating, 0) / all.length;
    await prisma.userStats.upsert({
      where: { userId: adminId },
      update: { averageRating: avg },
      create: { userId: adminId, averageRating: avg }
    });
    res.json(review);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// Security: Change Password
app.post('/api/auth/change-password', authenticateToken, async (req: any, res: any) => {
  const { old: oldPassword, new: newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Старый пароль неверен' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initialize SYSTEM user for tech support
async function initSystemUser() {
  const systemUser = await prisma.user.findUnique({ where: { username: 'SYSTEM' } });
  if (!systemUser) {
    await prisma.user.create({
      data: {
        id: 'SYSTEM',
        email: 'system@team.local',
        username: 'SYSTEM',
        nickname: 'Команда Поддержки',
        password: 'prevent_login_' + Math.random(),
        role: 'OWNER',
      }
    });
  }
}
initSystemUser().catch(console.error);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
