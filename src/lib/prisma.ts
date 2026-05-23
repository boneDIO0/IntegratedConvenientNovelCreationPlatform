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

// 採用擴充全域型別的標準寫法，防止 Next.js 在開發時重複建立連線池
declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
}

if (!globalThis.prismaGlobal) {
  globalThis.prismaGlobal = prismaClientSingleton();
}

export const prisma = globalThis.prismaGlobal;
export default prisma;