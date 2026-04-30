# Deployment Guide for SoulLink Support

This application is ready to be deployed on an **Ubuntu** server with **PostgreSQL** and **S3** storage.

## 1. Server Requirements
- Node.js 18+
- PostgreSQL Database
- S3-compatible storage (AWS S3, MinIO, etc.)

## 2. Setting up the Database
1. Update your `.env` file with your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/soul_link_db"
   ```
2. Run migrations to create the tables:
   ```bash
   npx prisma migrate dev --name init
   ```

## 3. Configuring S3 and SMTP
Update the following variables in your `.env` file:
- **SMTP**: For sending verification codes to users.
- **S3**: For storing user avatars and chat media files.
- **JWT_SECRET**: Use a strong random string for session security.

## 4. Production Build
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the frontend:
   ```bash
   npm run build
   ```
3. Start the server (using PM2 or a systemd service):
   ```bash
   NODE_ENV=production tsx server.ts
   ```

## 5. Integration with Telegram
To use this as a Mini App, register your bot with `@BotFather` and set the Mini App URL to your server's public address (e.g., `https://your-domain.com`).
