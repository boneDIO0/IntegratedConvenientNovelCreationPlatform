import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/auth-utils';

// 引入轉譯工具
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import HTMLtoDOCX from 'html-to-docx';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> } // 注意這裡參數名稱要對應資料夾名稱 [projectId]
) {
  try {
    const { projectId } = await params;
    
    // 專案成員才能匯出
    const auth = await verifyProjectAccess(projectId, ['OWNER', 'EDITOR', 'VIEWER']);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 取得請求的格式 (?format=txt 或是 ?format=docx)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'txt';

    // 從資料庫撈取整本小說所有章節
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        chapters: {
          orderBy: { orderIndex: 'asc' } // 依照 orderIndex 排序
        }
      }
    });

    if (!project) return NextResponse.json({ error: "找不到專案" }, { status: 404 });

    // 組合所有章節
    let fullHtml = `<h1>${project.title}</h1><br/>`;
    let fullText = `${project.title}\n\n`;

    project.chapters.forEach((chapter: any) => {
      if (!chapter.content) return;

      let chapterHtml = "";

      if (typeof chapter.content === 'object' && chapter.content.type === 'doc') {
        try {
          chapterHtml = generateHTML(chapter.content, [
            StarterKit,
            Underline,
          ]);
        } catch (err) {
          console.error(`章節 [${chapter.title}] 解析失敗:`, err);
          chapterHtml = "<p>（章節內容解析失敗）</p>";
        }
      } else if (typeof chapter.content === 'string') {
        // 如果不小心存成了純 HTML 字串
        chapterHtml = chapter.content;
      } else {
        // 空物件或是尚未編輯的新章節
        chapterHtml = "<p></p>";
      }

      // 組合 HTML (給 DOCX 用)
      fullHtml += `<h2>${chapter.title}</h2>${chapterHtml}<br/><br/>`;

      // 組合 TXT
      const plainText = chapterHtml
        .replace(/<p>/g, '')         
        .replace(/<\/p>/g, '\n\n')   
        .replace(/<br>/g, '\n')      
        .replace(/<[^>]+>/g, '');    
      
      fullText += `【 ${chapter.title} 】\n\n${plainText}\n\n`;
    });

    // 根據請求格式，回傳不同的檔案
    if (format === 'txt') {
      return new NextResponse(fullText, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(project.title)}.txt"`,
        },
      });
    }

    if (format === 'docx') {
      // 將 HTML 壓成 Word 檔的二進位 Buffer
      const fileBuffer = await HTMLtoDOCX(fullHtml, null, {
        title: project.title,
        // 因為匯出不一定有 session.user.name，給個預設值
        creator: 'Novel Platform', 
      });

      return new NextResponse(fileBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(project.title)}.docx"`,
        },
      });
    }

    return NextResponse.json({ error: "不支援的格式" }, { status: 400 });

  } catch (error) {
    console.error("匯出失敗:", error);
    return NextResponse.json({ error: "匯出時發生伺服器錯誤" }, { status: 500 });
  }
}