// 定義留言的 JSON 格式
export type Message = {
  id: string;
  users?: { name: string | null }
  content: string;
  createdAt: string;
  channelId: string;
  /*
  mentions: [user];
  referencedFile: file; <- 標記章節內段落用的
  referencedMessage: message;
  */
};