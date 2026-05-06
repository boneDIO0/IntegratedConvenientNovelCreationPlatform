import { Message } from "@/types/message";

export let mockDatabase: Message[] = [
  { id: 'msg-002', authorName: '書格拉底', content: '如果寫文章是你的力量，沒有了它你又是什麼？', createdAt: new Date().toISOString() },
  { id: 'msg-003', authorName: '筆卡兒', content: '我寫，故我在。', createdAt: new Date().toISOString() }
];