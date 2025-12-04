# Practice Rings Backend

Practice Rings（修煉圈圈）後端服務，提供一組簡單的 RESTful API，用來儲存與讀取個人每日修煉紀錄。

此 repo 同時是整個系統的「來源真相」，完整系統規格請見 `docs/SDD.md`。

## Tech Stack

- Node.js
- Express
- 檔案儲存：
  - v1：本機 JSON 檔（Zeabur Volume）
  - v2（規劃中）：Google Sheets（透過 Google Sheets API）

## 功能概述

- 提供前端呼叫的 API：
  - 取得 / 更新每日目標設定（settings）。
  - 取得 / 更新指定日期進度（含 coding / reading / writing 分鐘與 note）。
  - 取得最近 N 天的簡要紀錄（供橫向小圈圈列使用）。
- 由後端負責讀寫 `progress.json`：
  - 本機開發：讀寫專案根目錄下的 `progress.json`。
  - Zeabur：透過 Volume 掛載到 `/data/progress.json`。
- 登入與授權：
  - 前端使用單一密碼呼叫 `POST /api/login` 取得 token，並在當次瀏覽工作階段內將 token 保存在前端記憶體狀態。
  - 所有受保護 API（`/api/settings`、`/api/progress` 等）都必須透過 `Authorization: Bearer <token>` header 存取。
  - 目前不實作重新整理後自動登入，重新開啟頁面時使用者需要再次輸入密碼取得新 token。

## 專案結構

.
├─ server.js # Express 伺服器主程式
├─ progress.json # 本機開發用資料檔（Zeabur 上會改用 Volume 路徑）
├─ package.json
├─ pnpm-lock.yaml # 或其他對應的 lockfile
├─ .env.example # 環境變數範本（例如 DATA_FILE_PATH）
├─ .gitignore
└─ docs/
└─ SDD.md # 系統設計說明文件（前後端共用規格）


## 安裝與開發

### 1. 安裝相依套件

建議使用 pnpm（或改成自己習慣的 npm / yarn）：

````bash
pnpm install
````


### 2. 環境變數設定

建立 `.env`（可由 `.env.example` 複製）：

````bash
cp .env.example .env
````

常用變數：


JSON 檔案路徑
DATA_FILE_PATH=./progress.json

服務埠號，預設 3000
PORT=3000


- 本機開發時，`DATA_FILE_PATH` 可以先用 `./progress.json`。
- 部署到 Zeabur 時，會改成 `/data/progress.json`（並配合 Volume 掛載）。

### 3. 啟動本機開發伺服器

````bash
pnpm dev

或
pnpm start

或
node server.js
````


啟動後預設會在 `http://localhost:3000` 提供 API。

## API 說明（摘要）

> 詳細欄位與行為請參考 `docs/SDD.md`。

### 1. 設定相關

#### GET `/api/settings`

- 用途：取得每日目標設定。
- 回傳範例：

{
"codingGoalMinutes": 180,
"readingGoalMinutes": 90,
"writingGoalMinutes": 30
}


#### POST `/api/settings`

- 用途：更新每日目標設定。
- Request Body 範例：

{
"codingGoalMinutes": 150,
"readingGoalMinutes": 60,
"writingGoalMinutes": 45
}


- 回傳：

{
"success": true
}


### 2. 進度相關

#### GET `/api/progress?date=YYYY-MM-DD`

- 用途：取得某一天的詳細紀錄。
- 若當日尚未有紀錄，回傳 minutes 為 0、note 為空字串。

#### GET `/api/progress/recent?days=7`

- 用途：取得最近 N 天的簡要紀錄（含當日）。
- 回傳為陣列，每筆包含：
  - `date`
  - `codingMinutes`
  - `readingMinutes`
  - `writingMinutes`
  - （可選）`note`

#### POST `/api/progress`

- 用途：建立或更新某一天的紀錄。
- Request Body 有兩種使用情境：

1. 前端「儲存今天」按鈕：完整 body（包含 note）  
2. 計時段落結束自動儲存：只有時間，不含 note

後端行為：
- 若 body 含有 `note` 欄位 → 覆寫該日 note。
- 若 body 不含 `note` 欄位 → 保留既有 note 不變。

## 部署到 Zeabur

### 1. 建立服務並掛載 Volume

1. 在 Zeabur 建立一個 Node.js / 自訂 Docker 服務，指向本 repo。
2. 在該服務中新增 Volume：
   - Volume ID：例如 `practice-rings-data`
   - Mount Directory：`/data`
3. 在環境變數中設定：

DATA_FILE_PATH=/data/progress.json
PORT=3000


4. 重新部署服務。

### 2. 確認 API 正常

部署完成後，透過瀏覽器或 curl 測試：

https://<your-zeabur-domain>/api/health
https://<your-zeabur-domain>/api/settings
https://<your-zeabur-domain>/api/progress/recent?days=7


確認都能拿到合理的 JSON 回應。

### 3. 前端串接

前端專案的 `app.js` 中，將 `API_BASE` 設為 Zeabur 的網址，例如：

const API_BASE = 'https://<your-zeabur-domain>.zeabur.app';


## 未來擴充規劃

### 多使用者登入與權限

- 目前假設一個部署對應一個使用者。
- 未來若需要多使用者，可在後端：
  - 將資料結構改為以 `userId` 為上層 key（`records[userId][date]`）。
  - 在 API 中加入驗證（如 token / JWT / OAuth）。

### 改為 Google Sheets 儲存

- 目前讀寫 `progress.json`。
- 之後可以透過抽象 storage layer：
  - `FileStorage`（目前實作）
  - `GoogleSheetsStorage`（未來實作）
- 介面保持不變：
  - `readSettings` / `writeSettings`
  - `readRecords` / `writeRecords`
- 內部改為呼叫 Google Sheets API。

## 開發注意事項

- 本專案盡量以「語言原生行為與標準 API」為基礎（可對照 MDN 與 ECMAScript 規範）。
- 所有程式碼與文件命名風格：
  - 以 Airbnb JavaScript Style Guide 為主。
- 請避免在 repo 中提交真實 `.env` 或個人敏感資料。
