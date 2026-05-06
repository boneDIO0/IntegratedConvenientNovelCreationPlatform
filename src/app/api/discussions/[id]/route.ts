// 單一留言 API (UPDATE 和 DELETE)

import { NextResponse } from 'next/server';
import { deleteMessage } from '@/lib/mockDiscussionMessages';
import { handleApiError } from '@/lib/ErrorHandler';



export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const messageId = resolvedParams.id;
        const isDeleted = deleteMessage(messageId);

        if (!isDeleted) {
            return NextResponse.json({ status: "error", message: '找不到該則留言' }, { status: 404 });
        }

        return NextResponse.json({ status: "success", message: '留言刪除成功'}, { status: 200 });

    } catch (error) {
        return handleApiError(error, "刪除留言過程發生錯誤");
    }
}