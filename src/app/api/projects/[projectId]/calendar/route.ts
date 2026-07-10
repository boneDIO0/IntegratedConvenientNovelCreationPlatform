import prisma from "@/lib/prisma"; // 🌟 修正點 1：修正為正確的 default import，防止編譯器破防
import { handleApiError } from "@/lib/ErrorHandler";
import { NextResponse } from "next/server";
import { verifyProjectAccess } from "@/lib/auth-utils";
import { PROJECT_ROLES } from "@/lib/roles";

// 定義 Next.js 動態路由的 Params 型別
interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * 📥 GET: 獲取特定專案的自定義曆法設定
 * 適用情境：進入 EventForm 或 TimelineView 時，動態拉取該專案的 worldSetting 配置
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    // 僅專案內部的成員可以讀取曆法配置
    const auth = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR,
      PROJECT_ROLES.VIEWER
    ]);
    if (!auth.isAuthorized) {
      return NextResponse.json({ status: "error", message: auth.error }, { status: auth.status });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        worldSetting: true, 
      },
    });

    if (!project) {
      return NextResponse.json(
        { status: "error", message: "找不到指定的專案項目" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        message: "成功獲取專案曆法配置",
        data: project.worldSetting,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, "獲取專案曆法設定時發生異常！");
  }
}

/**
 * 💾 PUT: 更新特定專案的自定義曆法設定（雙軌制規格大儲存專用）
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    
    // 暫定擁有者和編輯者能更新特定專案的自定義曆法設定
    const auth = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized) {
      return NextResponse.json({ status: "error", message: auth.error }, { status: auth.status });
    }

    const body = await request.json();

    // 基礎後端防呆校驗
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { status: "error", message: "更新失敗：無效的曆法設定格式" },
        { status: 400 }
      );
    }

    const { mode, eras } = body;

    if (!mode || !['standard', 'fantasy_only'].includes(mode)) {
      return NextResponse.json({ status: "error", message: "⚠️ 儲存失敗：無效或缺失曆法運作模式" }, { status: 400 });
    }

    if (!eras || !Array.isArray(eras) || eras.length === 0) {
      return NextResponse.json({ status: "error", message: "⚠️ 儲存失敗：曆法系統至少需包含一個紀元時期" }, { status: 400 });
    }

    // 查詢原專案
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { worldSetting: true }
    });

    if (!project) {
      return NextResponse.json({ status: "error", message: "❌ 找不到對應的專案項目" }, { status: 404 });
    }

    // 🌟 修正點 3：雙軌制資料嚴密清洗與熔斷 (Data Sanitization)
    const sanitizedEras = eras.map((era: any, idx: number) => {
      const eraName = era.name?.trim() || `未命名新紀元-${idx + 1}`;
      
      if (mode === 'standard') {
        // 🌐 軌道 A：標準公式換算模式
        return {
          id: era.id || `era-${idx}-${Date.now()}`,
          name: eraName,
          startYear: typeof era.startYear === 'number' ? era.startYear : -Infinity,
          endYear: typeof era.endYear === 'number' ? era.endYear : null,
          isRetrograde: !!era.isRetrograde,
          months: Array.isArray(era.months) ? era.months.map((m: any) => ({
            name: m.name?.trim() || "未知之月",
            days: typeof m.days === 'number' ? m.days : 30
          })) : []
        };
      } else {
        // ✍️ 軌道 B：純自訂文字拖曳模式（主動排空 months 資料，防範資料庫肥大）
        return {
          id: era.id || `era-${idx}-${Date.now()}`,
          name: eraName,
          startYear: typeof era.startYear === 'number' ? era.startYear : null,
          endYear: null,
          isRetrograde: false,
          months: [] 
        };
      }
    });

    const currentWorldSetting = (project.worldSetting as any) || {};
    const updatedWorldSetting = {
      ...currentWorldSetting,
      mode: mode,
      eras: sanitizedEras
    };

    // 執行資料庫持久化更新
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        worldSetting: updatedWorldSetting,
      },
      select: {
        id: true,
        title: true,
        worldSetting: true,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message: "世界觀雙軌制曆法配置規則固化更新成功！",
        data: updatedProject.worldSetting,
      },
      { status: 200 }
    );
  } catch (error) {
    if ((error as any).code === "P2025") {
      return NextResponse.json(
        { status: "error", message: "更新失敗：找不到該專案紀錄" },
        { status: 404 }
      );
    }
    return handleApiError(error, "儲存專案曆法設定時發生未知異常！");
  }
}