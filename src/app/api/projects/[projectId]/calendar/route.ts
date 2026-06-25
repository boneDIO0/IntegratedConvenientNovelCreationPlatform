import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/ErrorHandler";
import { NextResponse } from "next/server";

// 🌟 定義 Next.js 動態路由的 Params 型別 (嚴格對齊 App Router 最新規範)
interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * 📥 GET: 獲取特定專案的自定義曆法設定
 * 適用情境：進入 EventForm 時，動態拉取該專案的 worldSetting 配置
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    // 1. 查詢該專案是否存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        worldSetting: true, // 僅抓取需要的曆法 JSONB 欄位
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
    // 🌟 整合小組統一的 ErrorHandler，自動紀錄伺服器出錯原因
    return handleApiError(error, "獲取專案曆法設定時發生異常！");
  }
}

/**
 * 💾 PUT: 更新特定專案的自定義曆法設定
 * 適用情境：使用者在 SettingsPanel 調整完曆法規則點擊儲存時
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    // 🌟 基礎後端防呆校驗 (Guard Clause)
    // 檢查曆法配置的核心必要欄位是否缺失，防止前端傳入壞軌的 JSON
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { status: "error", message: "更新失敗：無效的曆法設定格式" },
        { status: 400 }
      );
    }

    // 2. 執行資料庫持久化更新
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        // 穩穩寫入 JSONB 欄位
        worldSetting: body,
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
        message: "自定義世界觀曆法設定更新成功",
        data: updatedProject.worldSetting,
      },
      { status: 200 }
    );
  } catch (error) {
    // 偵測是否是因為 UUID 格式錯誤或 Prisma 找不到紀錄
    if ((error as any).code === "P2025") {
      return NextResponse.json(
        { status: "error", message: "更新失敗：找不到該專案紀錄" },
        { status: 404 }
      );
    }
    return handleApiError(error, "儲存專案曆法設定時發生未知異常！");
  }
}