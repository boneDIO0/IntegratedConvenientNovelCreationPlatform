// src/app/api/settings/[id]/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 在 Next.js 15+ / 16+ 中，params 是一個 Promise
interface RouteParams {
  params: Promise<{ id: string }>;
}

// ==========================================
// 📝 PUT 請求：更新指定的設定項目
// ==========================================
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params; 
    const body = await request.json(); 

    const { id: _frontendId, name, category, ...contentData } = body;

    const finalContent = {
      ...contentData,
      formType: category 
    };

    const updatedEntity = await prisma.settingEntity.update({
      where: { id },
      data: {
        title: name,
        content: finalContent,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json(updatedEntity, { status: 200 });
  } catch (error) {
    console.error(`PUT 錯誤:`, error);
    return NextResponse.json({ error: '無法更新設定' }, { status: 500 });
  }
}

// ==========================================
// 🗑️ DELETE 請求：刪除指定的設定項目（含連鎖清理孤兒關聯）
// ==========================================
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 🌟 核心修正：直接在更新主表時，利用 chapters.disconnect 傳入空陣列 []
    // 這在 Prisma 裡代表「一鍵切斷此要素與全世界所有章節的登場關聯表綁定」，乾淨俐落！
    await prisma.settingEntity.update({
      where: { id },
      data: {
        deletedAt: new Date(), // 標記為軟刪除
        chapters: {
          set: [] // 🌟 魔術指令：直接清空對照表中有關這條要素的所有登場紀錄
        }
      }
    });

    console.log(`後端安全報告：要素 ID ${id} 及其隱式章節登場關聯（_ChapterSettings）已完美抹除。`);
    return NextResponse.json({ message: '刪除成功，章節關聯已連鎖抹除' }, { status: 200 });
  } catch (error) {
    console.error(`DELETE 錯誤:`, error);
    return NextResponse.json({ error: '無法刪除設定' }, { status: 500 });
  }
}