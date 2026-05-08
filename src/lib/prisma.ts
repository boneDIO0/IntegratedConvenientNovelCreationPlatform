// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// 宣告全域變數以防止在開發模式 (Hot Reload) 下產生過多資料庫連線
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // 如果你不想在終端機看到 SQL 語法，這行可以刪掉
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;