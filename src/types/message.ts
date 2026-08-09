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
  referencedMessageId?: string;
  projectMessages?: {
    id: string;
    content: string;
    users?: { name: string | null };
  } | null;
  mentions?: string[];
  
  /* --- 未來預計擴充的功能 --- 
  referencedFileId?: string;    // 標記章節內段落用的 File ID 或 Block ID
  */
};