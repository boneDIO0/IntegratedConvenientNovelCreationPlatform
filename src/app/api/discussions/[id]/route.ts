import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/lib/ErrorHandler';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { verifyProjectAccess } from "@/lib/auth-utils";
import { PROJECT_ROLES } from "@/lib/roles";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: "error", message: "未授權，請先登入" }, { status: 401 });
        }
        
        const resolvedParams = await params;
        const messageId = resolvedParams.id;
        const body = await request.json();
        if (!body.content) {
            return NextResponse.json(
                { status: "error", message: "編輯失敗：留言內容不能為空" },
                { status: 400 }
            );
        }

        const existingMessage = await prisma.projectMessages.findUnique({
            where: { id: messageId },
            select: { authorId: true }
        });
        if (!existingMessage) {
            return NextResponse.json({ status: "error", message: "找不到該則留言" }, { status: 404 });
        }

        // 只有留言者本人可以修改留言
        if (existingMessage.authorId !== session.user.id) {
            return NextResponse.json({ status: "error", message: "Forbidden: 只能編輯自己的留言" }, { status: 403 });
        }

        const dataToUpdate: any = { content: body.content };
        if (body.mentions !== undefined) {
            dataToUpdate.mentions = body.mentions;
        }
        
        const updatedMessage = await prisma.projectMessages.update({
            where: { id: messageId },
            data: dataToUpdate
        });

        return NextResponse.json({ status: "success", message: '留言編輯成功', data: updatedMessage }, { status: 200 });

    } catch (error) {
        return handleApiError(error, "編輯留言過程發生錯誤");
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: "error", message: "未授權，請先登入" }, { status: 401 });
        }
        
        const resolvedParams = await params;
        const messageId = resolvedParams.id;

        const existingMessage = await prisma.projectMessages.findUnique({
            where: { id: messageId },
            select: { authorId: true, projectId: true }
        });
        if (!existingMessage) {
            return NextResponse.json({ status: "error", message: "找不到該則留言" }, { status: 404 });
        }

        let isAllowedToDelete = false;
        
        // 只有留言者本人或專案擁有者可以刪除留言
        if (existingMessage.authorId === session.user.id) {
            isAllowedToDelete = true;
        } else {
            const access = await verifyProjectAccess(
                existingMessage.projectId, 
                [PROJECT_ROLES.OWNER]
            );
            if (access.isAuthorized && access.role === 'OWNER') {
                isAllowedToDelete = true;
            }
        }
        if (!isAllowedToDelete) {
            return NextResponse.json({ status: "error", message: "Forbidden: 只有本人或管理員可以刪除留言" }, { status: 403 });
        }

        await prisma.projectMessages.delete({
            where: { id: messageId }
        });

        return NextResponse.json({ status: "success", message: '留言刪除成功' }, { status: 200 });

    } catch (error) {
        return handleApiError(error, "刪除留言過程發生錯誤");
    }
}