import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyProjectAccess } from "@/lib/auth-utils";
import { PROJECT_ROLES } from "@/lib/roles";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * PATCH /api/projects/[projectId]/calendar/mode
 * 用途：專供前端「模式切換」與「拖曳重新排序」使用的輕量化 API
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    // 僅擁有者和編輯者可以進行曆法模式切換與時期排序
    const auth = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { mode, sortedEraIds } = body;

    // 2. 業務參數基本防禦校驗 (過濾髒資料)
    if (!mode || !['standard', 'fantasy_only'].includes(mode)) {
      return NextResponse.json({ error: "⚠️ 錯誤的曆法運作模式參數" }, { status: 400 });
    }

    // 3. 撈出該專案目前儲存在資料庫的舊曆法設定 (避免覆蓋到使用者之前辛辛苦苦打的月份名字)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { worldSetting: true }
    });

    if (!project) {
      return NextResponse.json({ error: "❌ 找不到對應的專案項目" }, { status: 404 });
    }

    // 4. 解析現有的 World Setting 結構 (Prisma JsonB 解析安全熔斷)
    const currentConfig = (project.worldSetting as any) || { mode: "standard", eras: [] };
    let currentEras = Array.isArray(currentConfig.eras) ? currentConfig.eras : [];

    // 🌟 5. 核心精隨：如果前端有傳入拖曳後的「新 id 順序對齊陣列 (sortedEraIds)」
    if (sortedEraIds && Array.isArray(sortedEraIds)) {
      // 依據前端排好的 ID 齒輪，原地重新洗牌資料庫中的時期陣列順序
      currentEras = sortedEraIds
        .map(id => currentEras.find((e: any) => e.id === id))
        .filter(Boolean); // 排除無效的空元素
    }

    // 6. 組裝全新的輕量 Payload
    const updatedConfig = {
      ...currentConfig,
      mode: mode,
      eras: currentEras
    };

    // 7. 實時推送到雲端 Neon Postgres
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        worldSetting: updatedConfig // 覆蓋寫入 JSONB
      },
      select: { worldSetting: true }
    });

    return NextResponse.json({ 
      success: true, 
      message: "🎉 曆法排版與運行模式同步成功！", 
      data: updatedProject.worldSetting 
    }, { status: 200 });

  } catch (error) {
    console.error("[CALENDAR_MODE_PATCH_ERROR]:", error);
    return NextResponse.json({ error: "💥 伺服器核心阻斷，請檢查後端日誌" }, { status: 500 });
  }
}