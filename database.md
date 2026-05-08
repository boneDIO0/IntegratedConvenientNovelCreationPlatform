# 📖 Neon 資料庫指令操作手冊 (PowerShell 版)

本文件專為 Windows PowerShell 環境設計。請確保已安裝 `pnpm` 與 `PostgreSQL` 用戶端工具。

---

## 1. 載入環境變數 (PowerShell 模式)

在執行指令前，需先將 `.env` 檔案中的內容載入至 PowerShell 的會話變數中。

```powershell
# 載入 .env.local 與 .env.private (排除註解行並設定變數)
Get-Content .env.local, .env.private | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
    $name, $value = $_.Split('=', 2)
    [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim().Trim('"'), "Process")
}

# 驗證變數是否載入成功 (會印出 napi_... 開頭的內容)
$env:NEON_API_KEY
這是一個非常關鍵的提醒！PowerShell (PS) 的環境變數處理邏輯、讀檔方式以及指令語法與 Bash (Linux/macOS) 完全不同。如果你直接把 Bash 的 export 指令貼進 PS，它會直接報錯。

以下是專門為 Windows PowerShell 使用者優化的 DATABASE_OPERATIONS.md。

Markdown
# 📖 Neon 資料庫指令操作手冊 (PowerShell 版)

本文件專為 Windows PowerShell 環境設計。請確保已安裝 `pnpm` 與 `PostgreSQL` 用戶端工具。

---

## 1. 載入環境變數 (PowerShell 模式)

在執行指令前，需先將 `.env` 檔案中的內容載入至 PowerShell 的會話變數中。

```powershell
# 載入 .env.local 與 .env.private (排除註解行並設定變數)
Get-Content .env.local, .env.private | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
    $name, $value = $_.Split('=', 2)
    [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim().Trim('"'), "Process")
}

# 驗證變數是否載入成功 (會印出 napi_... 開頭的內容)
$env:NEON_API_KEY
```
## 2. 身份驗證與專案管理
## 使用已載入的 $env:NEON_API_KEY 進行操作。

# 身份認證
pnpm dlx neonctl auth --token $env:NEON_API_KEY

# 列出所有專案
pnpm dlx neonctl projects list

# 獲取指定分支的連線字串
pnpm dlx neonctl connection-string --branch main

# 3. 分支操作 (Branching Workflow)

# 建立開發分支
pnpm dlx neonctl branches create --name "dev_branch_01"

# 查看所有分支狀態
pnpm dlx neonctl branches list

這是一個非常關鍵的提醒！PowerShell (PS) 的環境變數處理邏輯、讀檔方式以及指令語法與 Bash (Linux/macOS) 完全不同。如果你直接把 Bash 的 export 指令貼進 PS，它會直接報錯。

以下是專門為 Windows PowerShell 使用者優化的 DATABASE_OPERATIONS.md。

Markdown
# 📖 Neon 資料庫指令操作手冊 (PowerShell 版)

本文件專為 Windows PowerShell 環境設計。請確保已安裝 `pnpm` 與 `PostgreSQL` 用戶端工具。

---

## 1. 載入環境變數 (PowerShell 模式)

在執行指令前，需先將 `.env` 檔案中的內容載入至 PowerShell 的會話變數中。

```powershell
# 載入 .env.local 與 .env.private (排除註解行並設定變數)
Get-Content .env.local, .env.private | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
    $name, $value = $_.Split('=', 2)
    [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim().Trim('"'), "Process")
}

# 驗證變數是否載入成功 (會印出 napi_... 開頭的內容)
$env:NEON_API_KEY
2. 身份驗證與專案管理
使用已載入的 $env:NEON_API_KEY 進行操作。

PowerShell
# 身份認證
pnpm dlx neonctl auth --token $env:NEON_API_KEY

# 列出所有專案
pnpm dlx neonctl projects list

# 獲取指定分支的連線字串
pnpm dlx neonctl connection-string --branch main
3. 分支操作 (Branching Workflow)

PowerShell
# 建立開發分支
pnpm dlx neonctl branches create --name "dev_branch_01"

# 查看所有分支狀態
pnpm dlx neonctl branches list

 4. 資料結構部署 (Schema Deployment)
使用 psql 執行 SQL 腳本。注意 PowerShell 傳遞變數的引號處理。

# 執行初始化腳本
psql $env:DIRECT_URL -f ./migrations/01_init_schema.sql

# 進入互動式介面
psql $env:DIRECT_URL

5.備份與還原
# 建立備份資料夾 (如果不存在)
if (!(Test-Path ./backups)) { New-Item -ItemType Directory -Path ./backups }

# 導出完整資料 (使用 Get-Date 格式化檔名)
$timestamp = Get-Date -Format "yyyy-MM-dd"
pg_dump $env:DIRECT_URL --clean --if-exists --no-owner > "./backups/full_dump_$timestamp.sql"

# 還原備份
psql $env:DIRECT_URL -f "./backups/full_dump_2026-05-07.sql"

6.ORM使用(Drizzle)：
pnpm dlx drizzle-kit generate

7.注意：以下區塊請不要在運行中使用！！

# 注意：這會刪除 public schema 下的所有內容，請謹慎使用
psql $env:DIRECT_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $env:DIRECT_URL -f ./migrations/01_init_schema.sql

