import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/lib/ErrorHandler';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const messageId = resolvedParams.id;

        const body = await request.json();
        if (!body.content) {
            return NextResponse.json(
                { status: "error", message: "編輯失敗：留言內容不能為空" },
                { status: 400 }
            );
        }

        const updatedMessage = await prisma.projectMessages.update({
            where: { id: messageId },
            data: { content: body.content }
        });

        return NextResponse.json({ status: "success", message: '留言編輯成功', data: updatedMessage }, { status: 200 });

    } catch (error) {
        return handleApiError(error, "編輯留言過程發生錯誤");
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const messageId = resolvedParams.id;

        await prisma.projectMessages.delete({
            where: { id: messageId }
        });

        return NextResponse.json({ status: "success", message: '留言刪除成功' }, { status: 200 });

    } catch (error) {
        return handleApiError(error, "刪除留言過程發生錯誤");
    }
}