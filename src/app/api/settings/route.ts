// src/app/api/settings/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 GET: 讀取所有目錄與設定項目
export async function GET() {
  try {
    const categories = await prisma.settingCategory.findMany({
      where: { deletedAt: null }, // 過濾掉被軟刪除的目錄
      include: {
        entities: {
          where: { deletedAt: null }, // 過濾掉被軟刪除的實體
          orderBy: { orderIndex: 'asc' } 
        }, 
      },
      orderBy: { orderIndex: 'asc' }
    });

    // 🌟 轉換成前端熟悉的格式
    const formattedData = categories.map(cat => ({
      category: cat.name,
      items: cat.entities.map(entity => {
        // 將 JSON 內容取出，如果是 null 則給空物件
        const contentObj = (entity.content as object) || {}; 
        
        return {
          id: entity.id,
          name: entity.title, 
          category: cat.type || 'custom', 
          ...contentObj // 🌟 關鍵修改：把 faction, description 等屬性直接展開
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
    
    const firstProject = await prisma.project.findFirst();
    if (!firstProject) {
      return NextResponse.json({ error: '資料庫中尚未建立任何 Project，無法新增設定！請先去建立專案。' }, { status: 400 });
    }
    
    if (body.type === 'new_category') {
      const newCat = await prisma.settingCategory.create({
        data: { 
          name: body.name,
          projectId: firstProject.id 
        }
      });
      return NextResponse.json(newCat, { status: 201 });
    }
    
    // 🌟 修正：把 const 改成 let，因為如果找不到，我們需要重新賦值
    let parentCategory = await prisma.settingCategory.findFirst({
      where: { name: body.categoryName, projectId: firstProject.id, deletedAt: null }
    });

    // 🌟 核心修正：如果資料庫裡找不到這個目錄，不要回傳 404，直接幫他建一個！
    if (!parentCategory) {
      parentCategory = await prisma.settingCategory.create({
        data: {
          name: body.categoryName,
          projectId: firstProject.id,
          type: body.type || 'custom',
        }
      });
    }

    const newEntity = await prisma.settingEntity.create({
      data: {
        title: body.item.name, 
        categoryId: parentCategory.id,
        projectId: firstProject.id, 
      }
    });

    // 回傳前端需要的格式
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