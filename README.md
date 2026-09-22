# 整合式便捷小說創作平台 (Writer's Haven) ✒️

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

Writer's Haven 是一個專為長篇小說創作者與多人接龍團隊打造的「一站式沉浸創作環境」。本系統將「靈感發想、大綱建構、正文寫作、團隊協作到公開發布」完美揉合，並導入 AI 語意檢索與視覺化圖譜技術，徹底解決世界觀設定混亂、版本管理不易與共編覆蓋等痛點。

[🎞️ Writer's Haven 介紹短片](https://www.youtube.com/watch?v=Jw4hGEYvJGQ)

[📑 Writer's Haven 網站](https://integrated-convenient-novel-creatio-beta.vercel.app/)

## ✨ 核心特色功能

*   **專屬虛構世界的動態時空引擎**：自訂紀元、曆法與逆向紀年，將事件與角色自動轉化為可追蹤的動態時間線，支援雙模時序防呆。
*   **設定集視覺化拓撲圖**：系統動態讀取人物關聯與陣營色彩，透過演算法即時渲染「全域人物關係無向圖」，複雜勢力一目了然。
*   **生成式 AI 創作智庫 (RAG)**：內建 AI 助理，精準讀取該部小說專屬的設定集與大綱脈絡，提供符合世界觀的劇情推演與防衝突建議，不破壞原創性。
*   **版本時光機與協作防呆**：多階段自動存檔與一鍵還原整章功能。針對多人協作實作非同步輪詢機制，偵測遠端異動並彈出衝突橫幅，確保心血互不覆蓋。
*   **沉浸式寫作體驗**：基於 Tiptap 生態系的富文本編輯器，提供雙欄介面動態維護「人事時地物」卡片，正文支援關鍵字反查設定。

## 🛠 技術堆疊 (Tech Stack)

### 前端 (Frontend)
*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Editor:** Tiptap (Headless Rich Text Editor)
*   **Styling & UI:** Tailwind CSS, Radix UI
*   **Visualization:** React Flow, Dagre 演算法

### 後端與資料庫 (Backend & Database)
*   **Database:** Neon (Serverless PostgreSQL)
*   **ORM:** Prisma ORM
*   **Connection Pooling:** PgBouncer
*   **Vector Search:** pgvector
*   **Authentication:** NextAuth (OAuth 2.0)

### 人工智慧與部署 (AI & Deployment)
*   **AI Model:** Google Gemini 2.5 Flash, Gemini Embedding 001
*   **Deployment:** Vercel (CI/CD)
*   **Cloud Storage:** Vercel Blob

## 🗺 專案狀態與 Roadmap

本專案依循 Scrum 敏捷開發框架，歷經 13 個 Sprint 迭代完成核心 MVP。
目前正在進行 **Closed Beta (封閉測試)** 前期準備，近期重點更新包含：

* [ ] 強化 GitHub Actions CI 流程，於 PR 時自動執行 `prisma generate` 型別檢驗。


* [ ] 修正章節軟刪除 (Soft Delete) 後，匯出 DOCX 檔案仍會包含已刪除章節的問題，以及重整章節編號邏輯。
* [ ] 於 AI 介面實裝 Good/Bad 即時反饋機制，以收集封測數據優化 Prompt。



## 🤝 貢獻與團隊

* **PO (Product Owner):** [boneDIO0](https://github.com/boneDIO0)，負責需求與優先級規劃。


* **SM (Scrum Master):** [Darren-Dev-Repo](https://github.com/Darren-Dev-Repo)，推動儀軌與協作架構。


* **Dev / DBA:** [AltinaCS](https://github.com/AltinaCS)、[FrostNori](https://github.com/FrostNori)、[HeRcULes302](https://github.com/HeRcULes302)，主導設定集、版本管理、PostgreSQL 建模與 AI 向量整合。

