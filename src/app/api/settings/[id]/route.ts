// src/app/api/settings/[id]/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 1. 修正：在 Next.js 15+ 中，params 變成了一個 Promise
interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT 請求：更新指定的設定項目
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    // 🌟 2. 修正：必須加上 await 來解開 params 拿出 id
    const { id } = await params; 
    const body = await request.json(); 

    const { id: _frontendId, name, category, ...contentData } = body;

    const updatedEntity = await prisma.settingEntity.update({
      where: { id },
      data: {
        title: name,
        content: contentData,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json(updatedEntity, { status: 200 });
  } catch (error) {
    // 這裡改印 error 本身，避免 params 還沒解開就報錯
    console.error(`PUT 錯誤:`, error);
    return NextResponse.json({ error: '無法更新設定' }, { status: 500 });
  }
}

// DELETE 請求：刪除指定的設定項目
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // 🌟 2. 修正：必須加上 await
    const { id } = await params;

    await prisma.settingEntity.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });

    return NextResponse.json({ message: '刪除成功' }, { status: 200 });
  } catch (error) {
    console.error(`DELETE 錯誤:`, error);
    return NextResponse.json({ error: '無法刪除設定' }, { status: 500 });
  }
}