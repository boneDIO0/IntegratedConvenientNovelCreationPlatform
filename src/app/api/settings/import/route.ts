import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const { targetProjectId, sourceProjectId } = await request.json();

    if (!targetProjectId || !sourceProjectId) {
      return NextResponse.json({ error: "缺少目標或來源作品 ID" }, { status: 400 });
    }

    const targetAuth = await verifyProjectAccess(targetProjectId, ['OWNER', 'EDITOR']);
    if (!targetAuth.isAuthorized) {
      return NextResponse.json({ error: "無權限修改此作品的設定" }, { status: 403 });
    }

    const sourceAuth = await verifyProjectAccess(sourceProjectId, ['OWNER', 'EDITOR', 'VIEWER']);
    if (!sourceAuth.isAuthorized) {
      return NextResponse.json({ error: "無權限讀取來源作品" }, { status: 403 });
    }

    // 撈取來源作品的世界觀設定與設定集
    const sourceProject = await prisma.project.findUnique({
      where: { id: sourceProjectId },
      include: {
        categories: {
          include: {
            entities: true 
          }
        }
      }
    });

    if (!sourceProject) {
      return NextResponse.json({ error: "找不到來源作品" }, { status: 404 });
    }

    if (sourceProject.categories.length === 0 && (!sourceProject.worldSetting || Object.keys(sourceProject.worldSetting).length === 0)) {
      return NextResponse.json({ error: "來源作品沒有任何設定集或世界觀可供匯入" }, { status: 400 });
    }

    const currentTimestamp = Date.now();

    await prisma.$transaction(async (tx) => {
      
      // 複製世界觀曆法
      if (sourceProject.worldSetting && Object.keys(sourceProject.worldSetting).length > 0) {
        await tx.project.update({
          where: { id: targetProjectId },
          data: {
            worldSetting: sourceProject.worldSetting
          }
        });
      }

      // 複製目錄與卡片
      for (const srcCat of sourceProject.categories) {
        const newCategory = await tx.settingCategory.create({
          data: {
            name: srcCat.name,
            type: srcCat.type,
            orderIndex: srcCat.orderIndex,
            isPreset: srcCat.isPreset,
            projectId: targetProjectId
          }
        });

        const entitiesDataToInsert = srcCat.entities.map(srcEntity => {
          const cleanContent = {
            ...(srcEntity.content as object || {}),
            versions: [
              {
                timestamp: currentTimestamp,
                name: "從其他作品匯入",
                authorName: "系統精靈",
                content: srcEntity.content
              }
            ]
          };

          return {
            title: srcEntity.title,
            categoryId: newCategory.id, 
            projectId: targetProjectId,
            content: cleanContent,
            orderIndex: srcEntity.orderIndex
          };
        });

        if (entitiesDataToInsert.length > 0) {
          await tx.settingEntity.createMany({
            data: entitiesDataToInsert
          });
        }
      }
    });

    return NextResponse.json({ message: "匯入成功" }, { status: 200 });

  } catch (error) {
    console.error("匯入設定集失敗:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}