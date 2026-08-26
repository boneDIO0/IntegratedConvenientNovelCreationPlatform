import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; 
import { SettingCategory, SettingEntity } from '@prisma/client';
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';

interface EntityWithChapters extends SettingEntity {
  chapters?: Array<{ id: string }>;
}

interface CategoryWithEntities extends SettingCategory {
  entities: EntityWithChapters[];
}

// 🌍 GET: 讀取這本小說的目錄與設定項目 (標記本章登場關聯)
export async function GET(request: NextRequest) { 
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const chapterId = searchParams.get('chapterId'); 

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
    }

    const auth = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR,
      PROJECT_ROLES.VIEWER
    ]);
    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const categories = await prisma.settingCategory.findMany({
      where: { 
        projectId: projectId, 
        deletedAt: null 
      }, 
      include: {
        entities: {
          where: { deletedAt: null }, 
          include: {
            chapters: {
              select: { id: true }
            }
          },
          orderBy: { orderIndex: 'asc' } 
        }, 
      },
      orderBy: { orderIndex: 'asc' }
    }) as CategoryWithEntities[];

    // 轉換成前端格式
    const formattedData = categories.map((cat: CategoryWithEntities) => ({
      category: cat.name,
      items: cat.entities.map((entity: EntityWithChapters) => {
        const contentObj = (entity.content as any) || {}; 
        
        // 🎯 只要 chapters 陣列中有當前章節的 ID，就判定為 true
        const isAssignedToChapter = Boolean(
          chapterId && 
          Array.isArray(entity.chapters) && 
          entity.chapters.some(c => c.id === chapterId)
        );

        // 🌟 確保 titles 為乾淨的字串陣列，排除等於本名的污染值
        let realTitles: string[] = [];
        if (Array.isArray(contentObj.titles)) {
          realTitles = contentObj.titles.filter((t: any) => typeof t === 'string' && t.trim() !== '' && t.trim() !== entity.title);
        }

        const safeContent = {
          ...contentObj,
          titles: realTitles,
          category: contentObj.category || contentObj.formType || cat.type || 'custom'
        };

        return {
          id: entity.id,
          name: entity.title, 
          category: safeContent.category, 
          chapters: entity.chapters || [],
          isChapterAssigned: isAssignedToChapter,
          isAssigned: isAssignedToChapter,
          titles: realTitles,
          content: safeContent, // 🌟 1. 務必回傳完整的 content 物件供前端表單讀取
          ...safeContent        // 🌟 2. 同步攤平屬性方便全域反查
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

    const auth = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
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
      const targetCategoryName = body.categoryName || body.name || "未命名目錄";

      parentCategory = await prisma.settingCategory.create({
        data: {
          name: targetCategoryName,
          projectId: projectId,
          type: body.type && body.type !== 'new_category' ? body.type : "custom" 
        }
      });
      
      if (body.type === 'new_category' || body.action === 'new_category') {
        return NextResponse.json(parentCategory, { status: 201 });
      }
    }

    const itemData = body.item || {};
    const itemTitle = itemData.name || itemData.title || body.name || "未命名設定";
    const itemContent = itemData.content && typeof itemData.content === 'object' ? itemData.content : itemData;

    // 🌟 3. 完整保存前端傳入的 content 屬性（包含 titles 等）
    const newEntity = await prisma.settingEntity.create({
      data: {
        title: itemTitle, 
        categoryId: parentCategory.id,
        projectId: projectId, 
        content: {
          ...itemContent,
          category: parentCategory.type || body.type || 'custom'
        }
      }
    });

    const formattedEntity = {
      id: newEntity.id,
      name: newEntity.title,
      category: parentCategory.type || body.type || 'custom',
      content: newEntity.content,
      ...((newEntity.content as any) || {})
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

      const auth = await verifyProjectAccess(projectId, [
        PROJECT_ROLES.OWNER,
        PROJECT_ROLES.EDITOR
      ]);
      if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

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

      const auth = await verifyProjectAccess(projectId, [
        PROJECT_ROLES.OWNER,
        PROJECT_ROLES.EDITOR
      ]);
      if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

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

// 🔀 PATCH: 同步本章登場關聯
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, chapterId, entityId } = body;

    if (!chapterId || !entityId) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { projectId: true }
    });

    if (!chapter) {
      return NextResponse.json({ error: '找不到對應的章節' }, { status: 404 });
    }

    const auth = await verifyProjectAccess(chapter.projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const targetEntity = await prisma.settingEntity.findFirst({
      where: { id: entityId, deletedAt: null }
    });
    if (!targetEntity) {
      return NextResponse.json({ error: '該設定項目不存在或已被刪除' }, { status: 404 });
    }

    if (action === 'connect_chapter') {
      await prisma.chapter.update({
        where: { id: chapterId },
        data: {
          assignedSettings: {
            connect: { id: entityId }
          }
        }
      });
      return NextResponse.json({ message: '成功將要素劃分至本章登場名單' }, { status: 200 });
    }

    if (action === 'disconnect_chapter') {
      await prisma.chapter.update({
        where: { id: chapterId },
        data: {
          assignedSettings: {
            disconnect: { id: entityId }
          }
        }
      });
      return NextResponse.json({ message: '成功從本章登場名單中撤出' }, { status: 200 });
    }

    return NextResponse.json({ error: '未知的變更動作' }, { status: 400 });
  } catch (error) {
    console.error("同步章節要素失敗:", error);
    return NextResponse.json({ error: '伺服器無法處理多對多關聯網路' }, { status: 500 });
  }
}