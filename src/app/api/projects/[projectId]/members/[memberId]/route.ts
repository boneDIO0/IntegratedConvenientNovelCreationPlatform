import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import prisma from "@/lib/prisma"
import { verifyProjectAccess } from "@/lib/auth-utils"
import { PROJECT_ROLES } from "@/lib/roles"

// PATCH：更改成員身分
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId, memberId } = resolvedParams
    const { newRole } = await req.json()

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 驗證執行者是否為 OWNER
    const access = await verifyProjectAccess(projectId, [PROJECT_ROLES.OWNER])
    if (!access.isAuthorized || access.role !== 'OWNER') {
      return NextResponse.json({ error: "只有管理員可以修改成員權限" }, { status: 403 })
    }

    // 防呆檢查：不能改自己
    if (memberId === session.user.id) {
      return NextResponse.json({ error: "不能修改自己的權限" }, { status: 400 })
    }

    if (!['EDITOR', 'VIEWER'].includes(newRole.toUpperCase())) {
      return NextResponse.json({ error: "無效的權限設定" }, { status: 400 })
    }

    const updatedMember = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId: projectId,
          userId: memberId,
        },
      },
      data: {
        role: newRole.toUpperCase(),
      },
    })

    return NextResponse.json({ message: "權限更新成功", member: updatedMember }, { status: 200 })

  } catch (error: any) {
    console.error("[PATCH_MEMBER_ROLE_ERROR]", error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "找不到該成員" }, { status: 404 })
    }
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 })
  }
}

// DELETE：移除成員
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId, memberId } = resolvedParams

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 驗證執行者是否為 OWNER
    const access = await verifyProjectAccess(projectId, [PROJECT_ROLES.OWNER])
    if (!access.isAuthorized || access.role !== 'OWNER') {
      return NextResponse.json({ error: "只有管理員可以踢除成員" }, { status: 403 })
    }

    // 防呆檢查：不能踢掉自己
    if (memberId === session.user.id) {
      return NextResponse.json({ error: "不能將自己踢出專案" }, { status: 400 })
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: projectId,
          userId: memberId,
        },
      },
    })

    return NextResponse.json({ message: "已將成員移出專案" }, { status: 200 })

  } catch (error: any) {
    console.error("[DELETE_MEMBER_ERROR]", error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "找不到該成員" }, { status: 404 })
    }
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 })
  }
}