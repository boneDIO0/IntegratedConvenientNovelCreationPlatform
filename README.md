# 整合式便捷小說平台

Darren 目前把基礎的專案架構先建好了，以下有幾件注意事項：  
1. 套件管理工具各位請統一使用 pnpm，安裝指令如下：   
```bash   
npm install -g pnpm
```   
2. Darren 比較懶，給 app 取名叫 novel-platform 了。   
3. 以下是 Darren 當時創建整個專案架構的指令：   
```bash   
pnpm create next-app@latest novel-platform --yes
# --yes 代表預設的方式安裝 (Enable TypeScripts, Tailwind CSS, ESLint, App Router, and Turbopack, with import alias @/*, and includes AGENTS.md)
cd novel-platform
pnpm dev
# 這代表啟動伺服器，就會有本地的網址可以點進去。
```   
不過這樣導致東西都被包在 novel-platform 資料夾裡，所以我最後把全部的東西都拖出來丟外面了。   

4. 各位 clone 或 pull 完之後請在終端機輸入：
```bash   
pnpm install # 或 pnpm i
```   
因為 push 的時候 .gitignore 會把 node_modules 擋掉，所以要輸入上述指令，再把 dependencies 都裝回來。   

## 專案架構
```plain text   
novel-platform/
├── src/
│   ├── app/                    # [App Router]
│   │   ├── editor/             # 文字編輯模組網址
│   │   │   └── page.tsx        # 網頁畫面檔案
│   │   ├── settings/           # 設定集模組網址
│   │   │   └── page.tsx        # 網頁畫面檔案
│   │   └── api/                # [後端 API 伺服器]
│   │       ├── versions/       # 版本管理 API (POST /api/versions)
│   │       │   └── route.ts
│   │       └── discussions/    # 留言區 API (POST /api/discussions)
│   │           └── route.ts
│   ├── components/             # [共用 UI 元件]
│   │   ├── EditorWidget.tsx    # 放 Vditor 編輯器元件的地方
│   │   └── DiscussionBoard.tsx # 留言板元件
│   ├── lib/                    # [後端工具庫]
│   │   └── db.ts               # 放資料庫連線程式碼的地方
│   └── types/                  # [TypeScript 型別定義]
│       └── index.ts            # 定義版本和留言的 JSON 格式
```   
接著各位就能各自開分支，並在需要的時候到對應的資料夾底下建立新的檔案。   

Next.js 的官方文件: [https://nextjs.org/docs](https://nextjs.org/docs)   


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
