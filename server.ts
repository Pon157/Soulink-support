import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// SMTP Transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mail.ru',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, 
  auth: {
    user: process.env.SMTP_USER || 'mail@dialogengine.ru',
    pass: process.env.SMTP_PASS,
  },
});

// --- API ROUTES ---

// 1. Request Registration Code
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

    // Send real email if configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"SoulLink Support" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Код подтверждения SoulLink',
        text: `Ваш код для регистрации: ${code}. Он действителен 10 минут.`,
      });
    }

    res.json({ success: true, message: 'Код отправлен на почту', debugCode: process.env.NODE_ENV !== 'production' ? code : undefined });
  } catch (error) {
    console.error('Code request error:', error);
    res.status(500).json({ error: 'Не удалось отправить код' });
  }
});

// 2. Complete Registration
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

    const user = await prisma.user.create({
      data: {
        email,
        username,
        nickname,
        password: hashedPassword,
        role: (await prisma.user.count()) === 0 ? 'OWNER' : 'USER'
      }
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
    res.json({ user, token });

    await prisma.verificationCode.delete({ where: { email } });
  } catch (error) {
    console.error('Registration fix error:', error);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// 3. Login
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
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// User routes (stats, profile, etc.)
app.get('/api/users/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { channel: true, stats: true }
    });
    res.json(user);
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Chats list
app.get('/api/chats', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Get unique users with whom the current user has messages
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });

    const chatPartnersIds = Array.from(new Set(
      messages.map(m => m.senderId === userId ? m.receiverId : m.senderId)
    ));

    const partners = await prisma.user.findMany({
      where: { id: { in: chatPartnersIds } },
      select: { id: true, nickname: true, username: true, avatar: true, role: true }
    });

    const chats = partners.map(partner => {
      const lastMsg = messages.find(m => m.senderId === partner.id || m.receiverId === partner.id);
      return {
        id: partner.id,
        name: partner.nickname,
        avatar: partner.avatar || `https://i.pravatar.cc/150?u=${partner.id}`,
        lastMsg: lastMsg?.content || (lastMsg?.mediaType === 'voice' ? 'Голосовое сообщение' : 'Медиа'),
        time: lastMsg?.createdAt || new Date(),
        unread: 0, // Simplified
      };
    });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Send message
app.post('/api/messages', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { receiverId, content, mediaUrl, mediaType } = req.body;

    const message = await prisma.message.create({
      data: {
        senderId: decoded.userId,
        receiverId,
        content: content || '',
        mediaUrl,
        mediaType,
      },
    });

    // Update user stats
    await prisma.userStats.upsert({
      where: { userId: decoded.userId },
      update: { messagesSent: { increment: 1 } },
      create: { userId: decoded.userId, messagesSent: 1 }
    });

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Messages history
app.get('/api/messages/:otherId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { otherId } = req.params;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: decoded.userId, receiverId: otherId },
          { senderId: otherId, receiverId: decoded.userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Staff list (for management)
app.get('/api/staff', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'CURATOR' },
        ],
      },
      include: { stats: true, managedBy: true },
    });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// System analytics
app.get('/api/stats/system', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const totalUsers = await prisma.user.count();
    const totalMessages = await prisma.message.count();
    const bannedUsers = await prisma.user.count({ where: { banStatus: 'BANNED' } });
    
    // Simulate some trend data
    const dailyStats = [40, 60, 45, 80, 55, 90, 70, 50, 65, 85]; 

    res.json({
      totalUsers,
      totalMessages,
      bannedUsers,
      dailyStats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system stats' });
  }
});

// Reviews handling
app.post('/api/reviews', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { adminId, rating, comment } = req.body;

    const review = await prisma.review.create({
      data: {
        adminId,
        userId: decoded.userId,
        rating,
        comment,
      },
    });

    // Update admin's average rating
    const allReviews = await prisma.review.findMany({ where: { adminId } });
    const avg = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;

    await prisma.userStats.upsert({
      where: { userId: adminId },
      update: { averageRating: avg },
      create: { userId: adminId, averageRating: avg }
    });

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to post review' });
  }
});

// Admin list for users to pick from (for starting new chat)
app.get('/api/admins', async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: { stats: true, channel: true },
    });
    res.json(admins);
  } catch {
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// --- VITE MIDDLEWARE ---

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
