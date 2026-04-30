import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// SMTP Transporter setup (using placeholders)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --- API ROUTES ---

// Registration & Verification
app.post('/api/auth/register', async (req, res) => {
  const { email, username, nickname } = req.body;
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await prisma.verificationCode.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt },
    });

    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: '"SoulLink" <noreply@soullink.app>',
        to: email,
        subject: 'SoulLink Verification Code',
        text: `Your verification code is: ${code}`,
      });
    }

    res.json({ success: true, message: 'Verification code sent', debugCode: code });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  const { email, code, username, nickname } = req.body;
  try {
    const record = await prisma.verificationCode.findUnique({ where: { email } });
    if (!record || record.code !== code || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          username,
          nickname,
          role: 'USER', // First user could be OWNER but usually set manually
        },
      });
      
      // Default owner logic for the very first user ever (if needed)
      const userCount = await prisma.user.count();
      if (userCount === 1) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'OWNER' }
        });
      }
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
    res.json({ user, token });

    await prisma.verificationCode.delete({ where: { email } });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed', details: error instanceof Error ? error.message : String(error) });
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

// Simulation of messages (REST or SSE would work, using basic REST for now)
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

// Admin list for users to pick from
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
