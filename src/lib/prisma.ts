import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const prismaClientSingleton = () => {
  // 強制把本機開發的連線數鎖死在 2 個以內
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 2, 
    idleTimeoutMillis: 1000, 
  });
  
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

<<<<<<< Updated upstream
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

=======
declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
}

// 🌟 標準寫法：先確保 global 變數被賦值，再統一匯出
if (!globalThis.prismaGlobal) {
  globalThis.prismaGlobal = prismaClientSingleton();
}

export const prisma = globalThis.prismaGlobal;
>>>>>>> Stashed changes
export default prisma;