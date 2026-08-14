import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/lib/ErrorHandler';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

// 讀取使用者的通知列表 (GET)
export async function GET(request: Request) {
  try {
    // 驗證登入狀態
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ status: "error", message: "未授權，請先登入" }, { status: 401 });
    }

    // 解析查詢參數
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // 設定查詢條件
    const whereClause: any = { 
      recipientId: session.user.id 
    };
    
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    // 撈取資料 (限制最多回傳 50 筆，避免效能問題)
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }, // 最新的在最上面
      take: 50,
      include: {
        actor: { 
          select: { name: true, image: true } // 順便撈出觸發者的頭像和名字
        }
      }
    });

    return NextResponse.json({ status: "success", data: notifications }, { status: 200 });

  } catch (error) {
    return handleApiError(error, "讀取通知過程發生錯誤");
  }
}

// 將通知標記為已讀 (PATCH)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ status: "error", message: "未授權，請先登入" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    // 情境 A：一鍵全部標記為已讀
    if (markAll) {
      await prisma.notification.updateMany({
        where: { 
          recipientId: session.user.id,
          isRead: false
        },
        data: { isRead: true }
      });
      return NextResponse.json({ status: "success", message: "已將所有通知標記為已讀" }, { status: 200 });
    }

    // 情境 B：單獨標記某一則通知為已讀
    if (notificationId) {
      // 防呆：確認這則通知真的存在，且是屬於目前登入者的
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { recipientId: true }
      });

      if (!notification) {
        return NextResponse.json({ status: "error", message: "找不到該則通知" }, { status: 404 });
      }

      if (notification.recipientId !== session.user.id) {
        return NextResponse.json({ status: "error", message: "無權限修改此通知" }, { status: 403 });
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
      });
      return NextResponse.json({ status: "success", message: "通知已標記為已讀", data: updatedNotification }, { status: 200 });
    }

    // 如果什麼參數都沒傳
    return NextResponse.json({ status: "error", message: "缺少必要參數 (notificationId 或 markAll)" }, { status: 400 });

  } catch (error) {
    return handleApiError(error, "更新通知狀態過程發生錯誤");
  }
}