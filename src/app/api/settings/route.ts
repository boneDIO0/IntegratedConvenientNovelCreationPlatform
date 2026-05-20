// src/app/api/settings/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 🌟 GET: 讀取這本小說的所有目錄與設定項目
export async function GET(request: Request) {
  try {
    // 🌟 從網址參數抓取 projectId (?projectId=xxx)
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
    }

    const categories = await prisma.settingCategory.findMany({
      where: { 
        projectId: projectId, // 🌟 關鍵：只抓這本小說的目錄
        deletedAt: null 
      }, 
      include: {
        entities: {
          where: { deletedAt: null }, 
          orderBy: { orderIndex: 'asc' } 
        }, 
      },
      orderBy: { orderIndex: 'asc' }
    });

    // 轉換成前端熟悉的格式
    const formattedData = categories.map(cat => ({
      category: cat.name,
      items: cat.entities.map(entity => {
        const contentObj = (entity.content as any) || {}; 
        
        return {
          id: entity.id,
          name: entity.title, 
          category: contentObj.formType || cat.type || 'custom', 
          ...contentObj
        };
      })
    }));
    
    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error("讀取設定資料失敗:", error);
    return NextResponse.json({ error: '無法讀取設定資料' }, { status: 500 });
  }
}

// 🌟 POST: 新增一個目錄 或 新增一個項目
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = body.projectId; // 🌟 接收前端傳來的 projectId

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId，無法新增設定' }, { status: 400 });
    }
    
    // 狀況 A：新增獨立目錄
    if (body.type === 'new_category') {
      let existingCat = await prisma.settingCategory.findFirst({
        where: { name: body.name, projectId: projectId, deletedAt: null }
      });

      if (existingCat) {
        return NextResponse.json(existingCat, { status: 200 });
      }

      const newCat = await prisma.settingCategory.create({
        data: { 
          name: body.name,
          projectId: projectId, // 🌟 綁定到這本小說
          type: body.categoryType || 'custom' 
        }
      });
      return NextResponse.json(newCat, { status: 201 });
    }
    
    // 狀況 B：新增項目
    let parentCategory = await prisma.settingCategory.findFirst({
      where: { name: body.categoryName, projectId: projectId, deletedAt: null }
    });

    if (!parentCategory) {
      parentCategory = await prisma.settingCategory.create({
        data: {
          name: body.categoryName,
          projectId: projectId, // 🌟 綁定到這本小說
          type: body.type || 'custom', 
        }
      });
    }

    const newEntity = await prisma.settingEntity.create({
      data: {
        title: body.item.name, 
        categoryId: parentCategory.id,
        projectId: projectId, // 🌟 綁定到這本小說
      }
    });

    const formattedEntity = {
      id: newEntity.id,
      name: newEntity.title,
      category: parentCategory.type || body.type || 'custom',
    };

    return NextResponse.json(formattedEntity, { status: 201 });
  } catch (error) {
    console.error("新增失敗:", error);
    return NextResponse.json({ error: '無法新增資料' }, { status: 500 });
  }
}

// 🌟 PUT: 更新目錄名稱
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'rename_category') {
      const projectId = body.projectId; // 🌟 接收 projectId
      if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });

      const targetCategory = await prisma.settingCategory.findFirst({
        where: { name: body.oldName, projectId: projectId, deletedAt: null }
      });

      if (!targetCategory) return NextResponse.json({ error: '找不到該目錄' }, { status: 404 });

      await prisma.settingCategory.update({
        where: { id: targetCategory.id },
        data: { name: body.newName }
      });

      return NextResponse.json({ message: '重新命名成功' }, { status: 200 });
    }

    return NextResponse.json({ error: '未知的操作' }, { status: 400 });
  } catch (error) {
    console.error("更新失敗:", error);
    return NextResponse.json({ error: '無法更新資料' }, { status: 500 });
  }
}

// 🌟 DELETE: 刪除整個目錄
export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'delete_category') {
      const projectId = body.projectId; // 🌟 接收 projectId
      if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });

      const targetCategory = await prisma.settingCategory.findFirst({
        where: { name: body.categoryName, projectId: projectId, deletedAt: null }
      });

      if (!targetCategory) return NextResponse.json({ error: '找不到該目錄' }, { status: 404 });

      // 1. 軟刪除這個目錄
      await prisma.settingCategory.update({
        where: { id: targetCategory.id },
        data: { deletedAt: new Date() }
      });

      // 2. 順便把這個目錄底下的所有項目 (Entities) 也一起軟刪除
      await prisma.settingEntity.updateMany({
        where: { categoryId: targetCategory.id },
        data: { deletedAt: new Date() }
      });

      return NextResponse.json({ message: '刪除目錄成功' }, { status: 200 });
    }

    return NextResponse.json({ error: '未知的操作' }, { status: 400 });
  } catch (error) {
    console.error("刪除失敗:", error);
    return NextResponse.json({ error: '無法刪除資料' }, { status: 500 });
  }
}