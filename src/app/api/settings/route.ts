// src/app/api/settings/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // 🌟 我們專案是用 prisma，不是 db！

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
    
    const firstProject = await prisma.project.findFirst();
    if (!firstProject) {
      return NextResponse.json({ error: '資料庫中尚未建立任何 Project，無法新增設定！請先去建立專案。' }, { status: 400 });
    }
    
    // 狀況 A：新增獨立目錄
    if (body.type === 'new_category') {
      // 🌟 護城河：先去資料庫查看看，是不是已經有這個名字的目錄了？
      let existingCat = await prisma.settingCategory.findFirst({
        where: { name: body.name, projectId: firstProject.id, deletedAt: null }
      });

      // 如果已經有了，就直接回傳現有的，不要重複建立！
      if (existingCat) {
        return NextResponse.json(existingCat, { status: 200 });
      }

      // 如果真的沒有，才建立新的
      const newCat = await prisma.settingCategory.create({
        data: { 
          name: body.name,
          projectId: firstProject.id,
          type: body.categoryType || 'custom' 
        }
      });
      return NextResponse.json(newCat, { status: 201 });
    }
    
    // 狀況 B：新增項目
    let parentCategory = await prisma.settingCategory.findFirst({
      where: { name: body.categoryName, projectId: firstProject.id, deletedAt: null }
    });

    // 懶漢式載入：如果資料庫裡找不到這個目錄，直接幫他建一個！
    if (!parentCategory) {
      parentCategory = await prisma.settingCategory.create({
        data: {
          name: body.categoryName,
          projectId: firstProject.id,
          type: body.type || 'custom', // 確保將傳過來的 character 等類型存入
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

// 🌟 PUT: 更新目錄名稱
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // 如果前端傳來的動作是「重新命名目錄」
    if (body.action === 'rename_category') {
      const firstProject = await prisma.project.findFirst();
      if (!firstProject) return NextResponse.json({ error: '找不到專案' }, { status: 400 });

      // 去資料庫找出那個舊名字的目錄
      const targetCategory = await prisma.settingCategory.findFirst({
        where: { name: body.oldName, projectId: firstProject.id, deletedAt: null }
      });

      if (!targetCategory) return NextResponse.json({ error: '找不到該目錄' }, { status: 404 });

      // 把資料庫裡的名字更新成新名字
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

    // 如果前端傳來的動作是「刪除目錄」
    if (body.action === 'delete_category') {
      const firstProject = await prisma.project.findFirst();
      if (!firstProject) return NextResponse.json({ error: '找不到專案' }, { status: 400 });

      // 去資料庫找出這個目錄
      const targetCategory = await prisma.settingCategory.findFirst({
        where: { name: body.categoryName, projectId: firstProject.id, deletedAt: null }
      });

      if (!targetCategory) return NextResponse.json({ error: '找不到該目錄' }, { status: 404 });

      // 1. 軟刪除這個目錄
      await prisma.settingCategory.update({
        where: { id: targetCategory.id },
        data: { deletedAt: new Date() }
      });

      // 2. 順便把這個目錄底下的所有項目 (Entities) 也一起軟刪除，避免產生孤兒資料
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