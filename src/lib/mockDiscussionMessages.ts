import { Message } from "@/types/message";

export let mockDatabase: Message[] = [
  { id: 'msg-002', authorName: '書格拉底', content: '如果寫文章是你的力量，沒有了它你又是什麼？', createdAt: new Date().toISOString() },
  { id: 'msg-003', authorName: '筆卡兒', content: '我寫，故我在。', createdAt: new Date().toISOString() }
];

// GET
export function getAllMessages() {
  return mockDatabase;
}

// POST
export function addMessage(newMessage: Message) {
  mockDatabase.push(newMessage);
  return newMessage;
}

// UPDATE
/*
export function updateMessage(id: string) {
  const 
}
*/

// DELETE
export function deleteMessage(id: string) {
  const initialLength = mockDatabase.length;
  
  // 過濾掉要刪除的 ID，重新賦值給 mockDatabase
  mockDatabase = mockDatabase.filter(msg => msg.id !== id);
  
  // 回傳 boolean 驗證是否真的刪除到東西
  return mockDatabase.length < initialLength; 
}