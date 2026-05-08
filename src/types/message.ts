// 定義留言的 JSON 格式
export type Message = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
  /*
  mentions: [user];
  referenced_file: file; <- 標記章節內段落用的
  channel_id: string;
  referenced_message: message;
  */
};