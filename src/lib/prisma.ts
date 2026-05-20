// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

// 🌟 修正：直接在宣告時進行具名匯出，確保 Turbopack 能精準解析
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// 保留預設匯出，相容專案中可能存在的 import prisma from '...' 寫法
export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;