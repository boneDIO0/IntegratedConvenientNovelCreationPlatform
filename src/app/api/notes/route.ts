import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; 
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';

// GET: 讀取這本小說的大綱與筆記清單
export async function GET(request: NextRequest) { 
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
    }

    const auth = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR,
      PROJECT_ROLES.VIEWER
    ]);
    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const categories = await prisma.noteCategory.findMany({
      where: { 
        projectId: projectId, 
        deletedAt: null 
      }, 
      include: {
        notes: {
          where: { deletedAt: null }, 
          orderBy: { orderIndex: 'asc' } 
        }, 
      },
      orderBy: { orderIndex: 'asc' }
    });

    const formattedData = categories.map((cat) => ({
      category: cat.name,
      items: cat.notes.map((note) => {
        const contentObj = (note.content as any) || {}; 
        return {
          id: note.id,
          name: note.title, 
          category: contentObj.category || contentObj.formType || cat.type || 'custom', 
          ...contentObj
        };
      })
    }));
    
    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error("讀取筆記資料失敗:", error);
    return NextResponse.json({ error: '無法讀取筆記資料' }, { status: 500 });
  }
}

// POST: 新增一個目錄 或 新增一個筆記
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body.projectId; 

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId，無法新增' }, { status: 400 });
    }

    const auth = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    if (body.type === 'new_category') {
      const existingCat = await prisma.noteCategory.findFirst({
        where: { name: body.name, projectId: projectId, deletedAt: null }
      });

      if (existingCat) return NextResponse.json(existingCat, { status: 200 });

      const newCat = await prisma.noteCategory.create({
        data: { 
          name: body.name,
          projectId: projectId, 
          type: body.categoryType || 'custom' 
        }
      });
      return NextResponse.json(newCat, { status: 201 });
    }
    
    let parentCategory = await prisma.noteCategory.findFirst({
      where: { name: body.categoryName, projectId: projectId, deletedAt: null }
    });

    if (!parentCategory) {
      parentCategory = await prisma.noteCategory.create({
        data: {
          name: body.categoryName,
          projectId: projectId, 
          type: body.type || 'custom', 
        }
      });
    }

    const newNote = await prisma.noteEntity.create({
      data: {
        title: body.item.name, 
        categoryId: parentCategory.id,
        projectId: projectId, 
        content: {
          category: parentCategory.type || body.type || 'custom'
        }
      }
    });

    const formattedEntity = {
      id: newNote.id,
      name: newNote.title,
      category: parentCategory.type || body.type || 'custom',
    };

    return NextResponse.json(formattedEntity, { status: 201 });
  } catch (error) {
    console.error("新增失敗:", error);
    return NextResponse.json({ error: '無法新增資料' }, { status: 500 });
  }
}

// PUT: 更新目錄名稱
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'rename_category') {
      const projectId = body.projectId; 
      if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });

      const auth = await verifyProjectAccess(projectId, [PROJECT_ROLES.OWNER, PROJECT_ROLES.EDITOR]);
      if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

      const targetCategory = await prisma.noteCategory.findFirst({
        where: { name: body.oldName, projectId: projectId, deletedAt: null }
      });

      if (!targetCategory) return NextResponse.json({ error: '找不到該目錄' }, { status: 404 });

      await prisma.noteCategory.update({
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

// DELETE: 刪除整個目錄
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'delete_category') {
      const projectId = body.projectId; 
      if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });

      const auth = await verifyProjectAccess(projectId, [PROJECT_ROLES.OWNER, PROJECT_ROLES.EDITOR]);
      if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

      const targetCategory = await prisma.noteCategory.findFirst({
        where: { name: body.categoryName, projectId: projectId, deletedAt: null }
      });

      if (!targetCategory) return NextResponse.json({ error: '找不到該目錄' }, { status: 404 });

      await prisma.noteCategory.update({
        where: { id: targetCategory.id },
        data: { deletedAt: new Date() }
      });

      await prisma.noteEntity.updateMany({
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