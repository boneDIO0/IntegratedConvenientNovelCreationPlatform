// 先暫定這三個身分，之後還會需要討論才能確認
export const PROJECT_ROLES = {
  OWNER: 'owner',   // 專案擁有者：可管理設定、刪除專案、管理成員
  EDITOR: 'editor', // 協作寫手：可編輯章節、新增設定、留言
  VIEWER: 'viewer', // 檢視者：僅可閱讀與留言
} as const;

export type ProjectRole = typeof PROJECT_ROLES[keyof typeof PROJECT_ROLES];