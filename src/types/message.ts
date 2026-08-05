// 定義留言的 JSON 格式
export type Message = {
  id: string;
  authorId: string;
  users?: { 
    name: string | null;
    image: string | null;
  };
  content: string;
  createdAt: string;
  channelId: string;
  /* --- 未來預計擴充的功能 --- 
  mentions?: string[];          // 標記特定使用者 (例如存入 User IDs)
  referencedFileId?: string;    // 標記章節內段落用的 File ID 或 Block ID
  referencedMessageId?: string; // 回覆特定留言用的 Message ID
  */
};