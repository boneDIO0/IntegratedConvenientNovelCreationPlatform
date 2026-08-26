import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { SettingItem } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授權存取" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, text, limit = 5 } = body;

    if (!projectId || !text || typeof text !== "string") {
      return NextResponse.json(
        { error: "缺少必要參數 (projectId, text)" },
        { status: 400 }
      );
    }

    const queryText = text.trim();
    if (queryText.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // 1. 動態相容 Prisma 模型查詢 (相容 prisma.setting 或 prisma.settingItem)
    const settingDelegate = (prisma as any).setting || (prisma as any).settingItem;
    
    let rawItems: any[] = [];
    if (settingDelegate) {
      rawItems = await settingDelegate.findMany({
        where: {
          projectId: projectId,
          deletedAt: null,
        },
      });
    }

    const lowerQuery = queryText.toLowerCase();

    // 2. 補齊型別註釋，消除 TS7006 報錯
    const scoredResults = rawItems
      .map((item: any) => {
        let score = 0;
        const itemName = (item.name || item.title || "").toLowerCase();
        const content = (item.content && typeof item.content === "object" ? item.content : {}) as Record<string, any>;

        // (A) 完全命中名稱 -> 最高優先級
        if (itemName === lowerQuery) {
          score += 100;
        }
        // (B) 名稱包含選取詞 或 選取詞包含名稱
        else if (itemName && (itemName.includes(lowerQuery) || lowerQuery.includes(itemName))) {
          score += 60;
        }

        // (C) 稱號 / 別名命中
        const titles: string[] = [
          ...(Array.isArray(item.titles) ? item.titles : []),
          ...(Array.isArray(content.titles) ? content.titles : []),
          ...(Array.isArray(item.aliases) ? item.aliases : []),
          ...(Array.isArray(content.aliases) ? content.aliases : []),
          item.title,
          content.title,
        ].filter(Boolean);

        for (const t of titles) {
          const lowerTitle = String(t).toLowerCase();
          if (lowerTitle === lowerQuery) {
            score += 80;
          } else if (lowerTitle.includes(lowerQuery) || lowerQuery.includes(lowerTitle)) {
            score += 40;
          }
        }

        // (D) 陣營 / 領袖 / 核心關係命中
        if (
          content.faction?.toLowerCase?.().includes(lowerQuery) ||
          content.leader?.toLowerCase?.().includes(lowerQuery) ||
          content.territory?.toLowerCase?.().includes(lowerQuery)
        ) {
          score += 30;
        }

        // (E) 描述內容命中
        const desc = (item.description || content.description || "").toLowerCase();
        if (desc.includes(lowerQuery)) {
          score += 15;
        }

        return {
          ...item,
          matchScore: score,
        };
      })
      .filter((item: { matchScore: number }) => item.matchScore > 0)
      .sort((a: { matchScore: number }, b: { matchScore: number }) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return NextResponse.json({
      matches: scoredResults,
      count: scoredResults.length,
      query: queryText,
    });
  } catch (error: any) {
    console.error("設定匹配 API 發生錯誤:", error);
    return NextResponse.json(
      { error: "伺服器內部錯誤", details: error?.message },
      { status: 500 }
    );
  }
}