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

const prisma = new PrismaClient();
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

// --- MIDDLEWARE ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireOwner = (req: any, res: any, next: any) => {
  if (req.user.role !== 'OWNER') return res.status(403).json({ error: 'Access denied' });
  next();
};

// --- API ROUTES ---

// Staff Management
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
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Toggle Rest Mode
app.post('/api/users/toggle-rest', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { isOnRest: !user?.isOnRest } as any
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

        if (user.role === 'USER') {
            const givenReviews = await prisma.review.findMany({ where: { userId } });
            const avg = givenReviews.length > 0 ? (givenReviews.reduce((a, b) => a + b.rating, 0) / givenReviews.length) : 0;
            (user as any).givenReviewsCount = givenReviews.length;
            (user as any).averageRatingGiven = avg;
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
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: 'desc' },
    });

    const chatPartnersIds = Array.from(new Set(
      messages.map(m => m.senderId === userId ? m.receiverId : m.senderId)
    ));

    const partners = await prisma.user.findMany({
      where: { id: { in: chatPartnersIds } },
      select: { id: true, nickname: true, avatar: true }
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
      };
    });

    // Add Technical Support Chat (System)
    const techMsg = messages.find(m => m.senderId === 'SYSTEM' || m.receiverId === 'SYSTEM');
    const techChat = {
        id: 'SYSTEM',
        name: 'Техподдержка Команды',
        avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712139.png',
        lastMsg: techMsg?.content || 'Системные уведомления и новости',
        time: techMsg?.createdAt || new Date(),
        unread: messages.filter(m => m.receiverId === userId && m.senderId === 'SYSTEM' && !m.read).length,
        isPinned: true
    };

    res.json([techChat, ...chats]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// 8. Messages history
app.get('/api/messages/:otherId', authenticateToken, async (req: any, res: any) => {
  const { otherId } = req.params;
  const userId = req.user.userId;
  try {
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
  let { receiverId, content, mediaUrl, mediaType } = req.body;
  try {
    if (receiverId === 'SYSTEM') {
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
      },
    });

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
      return res.json({ totalUsers, totalMessages, bannedUsers, dailyStats: [30, 40, 35, 50, 45, 60, 55, 40, 50, 65] });
    }
    
    // Admins see only their stats
    const stats = await prisma.userStats.findUnique({ where: { userId: req.user.userId } });
    res.json({ 
      personal: true,
      messagesSent: stats?.messagesSent || 0,
      averageRating: stats?.averageRating || 0,
      dialogsCount: stats?.dialogsCount || 0
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

// Sanctions: Ban/Warn/Unban
app.post('/api/sanctions', authenticateToken, requireOwner, async (req: any, res: any) => {
  const { targetId, action, reason } = req.body;
  try {
    let updateData: any = {};
    if (action === 'ban') updateData = { banStatus: 'BANNED' };
    if (action === 'unban') updateData = { banStatus: 'NONE' };
    if (action === 'warn') updateData = { warnCount: { increment: 1 }, banStatus: 'WARNED' };
    if (action === 'unwarn') updateData = { warnCount: 0, banStatus: 'NONE' };

    const user = await prisma.user.update({
      where: { 
        id: targetId.includes('-') ? targetId : undefined, // Check if UUID
        username: !targetId.includes('-') ? targetId : undefined // Or Username
      },
      data: updateData
    });
    res.json(user);
  } catch (e) {
    res.status(404).json({ error: 'User not found' });
  }
});

// Channels API
app.get('/api/channels', authenticateToken, async (req: any, res: any) => {
  try {
    const channels = await prisma.channel.findMany({
      include: { 
        owner: { select: { nickname: true, avatar: true } },
        _count: { select: { subscribers: true, posts: true } }
      }
    });
    res.json(channels);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/channels/post', authenticateToken, async (req: any, res: any) => {
  const { content, mediaUrl } = req.body;
  try {
    const channel = await prisma.channel.findUnique({ where: { ownerId: req.user.userId } });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    const post = await prisma.post.create({
      data: { content, mediaUrl, channelId: channel.id }
    });
    res.json(post);
  } catch (e) {
    res.status(500).json({ error: 'Failed to post' });
  }
});

app.post('/api/channels/subscribe/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const sub = await prisma.subscription.create({
      data: { userId: req.user.userId, channelId: req.params.id }
    });
    res.json(sub);
  } catch {
    res.status(400).json({ error: 'Already subscribed' });
  }
});

// Broadcast - Global mailing to SYSTEM chat
app.post('/api/broadcast/send', authenticateToken, requireOwner, async (req: any, res: any) => {
  const { title, content } = req.body;
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    const tasks = users.map(u => 
      prisma.message.create({
        data: {
          senderId: 'SYSTEM',
          receiverId: u.id,
          content: `[РАССЫЛКА: ${title}]\n${content}`,
          mediaType: 'text'
        }
      })
    );
    await Promise.all(tasks);
    res.json({ success: true });
  } catch (e) {
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

app.get('/api/admins', authenticateToken, async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
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
