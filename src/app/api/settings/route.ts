import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // 🌟 修正 1：對齊專案的 default export 引入
// 🌟 核心修正：改從你們物理生成的 client 引入型別！
import { SettingCategory, SettingEntity } from '@prisma/client';

// 🌟 修正 2：明確定義多層級關聯的 TypeScript 型別介面，徹底消滅 Implicit Any 錯誤
interface EntityWithChapters extends SettingEntity {
  chapters?: Array<{ id: string }>;
}

interface CategoryWithEntities extends SettingCategory {
  entities: EntityWithChapters[];
}

// 🌍 GET: 讀取這本小說的目錄與設定項目 (支援按章節局部過濾)
export async function GET(request: NextRequest) { // 🌟 修正 3：改用標準 NextRequest
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const chapterId = searchParams.get('chapterId'); 

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
    }

    // 宣告帶有明確型別的變數，防止 TypeScript 放空思考
    let categories: CategoryWithEntities[] = [];

    if (chapterId) {
      // 🎬 模式 A：章節局部模式。只過濾出與該章節有建立多對多連動的設定實體
      const result = await prisma.settingCategory.findMany({
        where: { 
          projectId: projectId, 
          deletedAt: null 
        }, 
        include: {
          entities: {
            where: { 
              deletedAt: null,
              chapters: {
                some: { id: chapterId } 
              }
            }, 
            orderBy: { orderIndex: 'asc' } 
          }, 
        },
        orderBy: { orderIndex: 'asc' }
      });
      categories = result as CategoryWithEntities[];
    } else {
      // 🌍 模式 B：全域世界觀模式。一網打盡這本小說所有的設定資料
      const result = await prisma.settingCategory.findMany({
        where: { 
          projectId: projectId, 
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
      categories = result as CategoryWithEntities[];
    }

    // 轉換成前端熟悉的格式
    // 🌟 修正 4：為 map 迭代器中的 cat 與 entity 注入明確型別，保護 Vercel 產線
    const formattedData = categories.map((cat: CategoryWithEntities) => ({
      category: cat.name,
      items: cat.entities.map((entity: EntityWithChapters) => {
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

// ➕ POST: 新增一個目錄 或 新增一個項目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body.projectId; 

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId，無法新增設定' }, { status: 400 });
    }
    
    if (body.type === 'new_category') {
      const existingCat = await prisma.settingCategory.findFirst({
        where: { name: body.name, projectId: projectId, deletedAt: null }
      });

      if (existingCat) {
        return NextResponse.json(existingCat, { status: 200 });
      }

      const newCat = await prisma.settingCategory.create({
        data: { 
          name: body.name,
          projectId: projectId, 
          type: body.categoryType || 'custom' 
        }
      });
      return NextResponse.json(newCat, { status: 201 });
    }
    
    let parentCategory = await prisma.settingCategory.findFirst({
      where: { name: body.categoryName, projectId: projectId, deletedAt: null }
    });

    if (!parentCategory) {
      parentCategory = await prisma.settingCategory.create({
        data: {
          name: body.categoryName,
          projectId: projectId, 
          type: body.type || 'custom', 
        }
      });
    }

    const newEntity = await prisma.settingEntity.create({
      data: {
        title: body.item.name, 
        categoryId: parentCategory.id,
        projectId: projectId, 
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

// 📝 PUT: 更新目錄名稱
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'rename_category') {
      const projectId = body.projectId; 
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

// ❌ DELETE: 刪除整個目錄
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'delete_category') {
      const projectId = body.projectId; 
      if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });

      const targetCategory = await prisma.settingCategory.findFirst({
        where: { name: body.categoryName, projectId: projectId, deletedAt: null }
      });

      if (!targetCategory) return NextResponse.json({ error: '找不到該目錄' }, { status: 404 });

      await prisma.settingCategory.update({
        where: { id: targetCategory.id },
        data: { deletedAt: new Date() }
      });

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

// 🛠️ PATCH: 處理章節與設定項目的「局部登場關聯」(多對多 Connect / Disconnect)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, chapterId, entityId } = body;

    if (!chapterId || !entityId) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    // 防呆：確認該設定項目目前非軟刪除狀態
    const targetEntity = await prisma.settingEntity.findFirst({
      where: { id: entityId, deletedAt: null }
    });
    if (!targetEntity) {
      return NextResponse.json({ error: '該設定項目不存在或已被刪除' }, { status: 404 });
    }

    if (action === 'connect_chapter') {
      // 🌟 使用原生 SQL 直接對多對多聯結表插入資料，100% 穩定，強制轉型防呆
      await prisma.$executeRaw`
        INSERT INTO "_ChapterSettings" ("A", "B")
        VALUES (${String(chapterId)}::uuid, ${String(entityId)}::uuid)
        ON CONFLICT DO NOTHING
      `;
      return NextResponse.json({ message: '成功將要素劃分至本章登場名單' }, { status: 200 });
    }

    if (action === 'disconnect_chapter') {
      // 🌟 使用原生 SQL 直接從聯結表刪除關聯記錄
      await prisma.$executeRaw`
        DELETE FROM "_ChapterSettings"
        WHERE "A" = ${String(chapterId)}::uuid AND "B" = ${String(entityId)}::uuid
      `;
      return NextResponse.json({ message: '成功從本章登場名單中撤出' }, { status: 200 });
    }

    return NextResponse.json({ error: '未知的變更動作' }, { status: 400 });
  } catch (error) {
    console.error("同步章節要素失敗:", error);
    return NextResponse.json({ error: '伺服器無法處理多對多關聯網路' }, { status: 500 });
  }
}