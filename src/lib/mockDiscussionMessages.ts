import { Message } from "@/types/message";

export let mockDatabase: Message[] = [
  { id: 'msg-002', authorName: '書格拉底', content: '如果寫作是你的力量，沒了它你又算什麼？', createdAt: new Date().toISOString() },
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

// PUT

export function updateMessage(id: string, newContent: string) {
  const index = mockDatabase.findIndex(msg => msg.id === id);
  
  if (index === -1) {
    return null; 
  }

  mockDatabase[index].content = newContent;
/*mockDatabase[index].updatedAt = new Date().toISOString();
  之後加上修改時間 */
  
  return mockDatabase[index];  
}


// DELETE
export function deleteMessage(id: string) {
  const initialLength = mockDatabase.length;
  
  // 過濾掉要刪除的 ID，重新賦值給 mockDatabase
  mockDatabase = mockDatabase.filter(msg => msg.id !== id);
  
  // 回傳 boolean 驗證是否真的刪除到東西
  return mockDatabase.length < initialLength; 
}