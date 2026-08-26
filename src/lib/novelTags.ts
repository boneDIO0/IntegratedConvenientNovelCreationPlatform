export const NOVEL_TAGS = [
  '武俠',
  '修仙/仙俠',
  '奇幻',
  '玄幻',
  '科幻',
  '歷史',
  '架空',
  '都市',
  '現代',
  '遊戲',
  '末世',
  '懸疑',
  '推理',
  '靈異/恐怖',
  '校園/青春',
  '日常/輕喜劇',
] as const

export type NovelTag = typeof NOVEL_TAGS[number]

export const MAX_NOVEL_TAGS = 5
