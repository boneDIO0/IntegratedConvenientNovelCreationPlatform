// src/types/novel.ts
import { JSONContent } from '@tiptap/react'

// 🌟 先定義「章節」長什麼樣子
export interface Chapter {
  id: string;           // 章節的專屬 ID
  title: string;        // 章節名稱
  content: JSONContent; // 文字內容
  order: number;        // 章節排序
  updatedAt: string;    // 最後修改時間
}

export interface Novel {
  id: string;           // 小說的專屬 ID
  title: string;        // 小說書名
  authorId: string;
  chapters: Chapter[];
  savedAt: string;
}