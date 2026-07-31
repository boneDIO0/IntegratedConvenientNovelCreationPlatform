import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import prisma from "@/lib/prisma"
import { verifyProjectAccess } from "@/lib/auth-utils"
import { PROJECT_ROLES } from "@/lib/roles"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { projectId } = resolvedParams;

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權，請先登入" }, { status: 401 })
    }

    // 驗證該使用者是否為專案成員
    const access = await verifyProjectAccess(projectId, [PROJECT_ROLES.OWNER, PROJECT_ROLES.EDITOR, PROJECT_ROLES.VIEWER])
    if (!access) {
      return NextResponse.json({ error: "無權限查看此專案成員" }, { status: 403 })
    }

    // 從資料庫取得專案成員與其基本資料
    const projectUsers = await prisma.projectMember.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      // 可以依照角色排序，或是加入時間排序
      orderBy: {
        createdAt: 'asc',
      },
    })

    // 4. 將資料整理成前端好處理的乾淨格式
    const members = projectUsers.map((pu) => ({
      id: pu.user.id, // 使用者的 ID (未來踢人或改權限需要用到)
      name: pu.user.name,
      email: pu.user.email,
      image: pu.user.image,
      role: pu.role,  // 'OWNER', 'EDITOR', 'VIEWER' 等等
      joinedAt: pu.createdAt,
    }))

    return NextResponse.json({ members }, { status: 200 })

  } catch (error) {
    console.error("[GET_MEMBERS_ERROR]", error)
    return NextResponse.json(
      { error: "無法取得成員名單，伺服器發生錯誤" },
      { status: 500 }
    )
  }
}