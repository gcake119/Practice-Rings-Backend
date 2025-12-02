# Practice Rings（修煉圈圈）SDD

## 1. 專案概述

- 專案名稱：Practice Rings（修煉圈圈）
- 目的：
  - 提供一個簡單的網頁工具，讓使用者像 Apple Watch 活動圈圈一樣，追蹤每天的學習投入。
  - 聚焦三個學習面向：
    - 刷題（Coding）
    - 閱讀（Reading）
    - 技術筆記（Writing）
- 技術棧：
  - 前端：原生 HTML / CSS / JavaScript（無框架）。
  - 後端：Node.js + Express。
  - 儲存：
    - v1：本機 JSON 檔。
    - v2（未來）：Google 試算表（Google Sheets API）。

---

## 2. 功能需求

### 2.1 使用者角色

- Individual Learner（個人學習者）
  - 只有一種角色，無多使用者帳號。
  - 初版假設一個部署對應一個使用者。

### 2.2 核心功能

#### 2.2.1 日常進度追蹤（三圈圈）

- 三個圈圈代表每日累積的實作時間：
  - Coding Ring：
    - 追蹤當日「刷題 / 寫測試 / 重構」累積分鐘數。
  - Reading Ring：
    - 追蹤當日「系統性閱讀技術文件 / 書籍」累積分鐘數。
  - Writing Ring：
    - 追蹤當日「撰寫技術筆記」累積分鐘數或完成狀態。
- 每個圈圈顯示：
  - 百分比：已完成分鐘數 / 目標分鐘數（最大 100％）。
  - 數字：`current / goal`（分鐘）。

#### 2.2.2 模式計時器（Timer Modes）

- 可選擇當前工作模式：
  - Coding / Reading / Writing。
- 操作：
  - 選擇模式。
  - Start：開始計時該模式。
  - Pause / Stop：停止計時，將本段時間加到當日該模式累積。
  - 切換模式時：
    - 自動結束前一模式計時，累加時間，再開始新模式計時。
- 計算規則：
  - 每段時間的起點：`timerStartTime`（timestamp）。
  - 結束時計算：
    - `elapsedMs = now - timerStartTime`。
    - `elapsedMinutes = floor(elapsedMs / 60000)` 或保留 1 位小數。
  - 加總到當日：
    - `todayMinutes[mode] += elapsedMinutes`。

#### 2.2.3 每日紀錄管理

- 今日資料：
  - `date`: `YYYY-MM-DD`。
  - `codingMinutes`: number。
  - `readingMinutes`: number。
  - `writingMinutes`: number。
  - `note`: string（可簡短描述今日重點）。
- 功能：
  - 載入頁面時：
    - 從後端取得今天紀錄；若不存在，建立預設 0。
  - 手動調整：
    - 使用者可在 UI 中改寫三個模式的分鐘數（例如加減按鈕或輸入框）。
  - 儲存今天：
    - 按「儲存今天」按鈕時，呼叫後端，更新當日紀錄。

#### 2.2.4 歷史紀錄檢視

- 顯示最近 N 天（預設 7 天）簡要紀錄：
  - 每天一列：
    - 日期。
    - 三個模式的完成度（用小條或小點表示）。
- 目的：
  - 讓使用者看到連續練習狀況與週期節奏。

#### 2.2.5 目標設定（Goals）

- 每個模式有獨立目標分鐘數：
  - `codingGoalMinutes`：預設 180。
  - `readingGoalMinutes`：預設 90。
  - `writingGoalMinutes`：預設 30。
- 使用者可以在 UI 調整目標：
  - 例如改成 150 / 60 / 45 分鐘。
- 儲存：
  - 透過後端儲存於 JSON 檔 `settings` 欄位。

### 2.3 非功能性需求

- 簡單部署：
  - 前端可部署在 GitHub Pages。
  - 後端可部署於 Zeabur。
- 離線友好（未來加分項）：
  - 若後端不可用，前端可暫存今日進度於 localStorage，待恢復後再同步。

---

## 3. 系統架構設計

### 3.1 整體架構

- Client（Browser）：
  - `index.html` / `style.css` / `app.js`。
  - 負責 UI 呈現、模式計時器、計算三圈圈百分比、呼叫後端 API。
- Server（Node.js + Express）：
  - `server.js`。
  - 提供 RESTful API：
    - 取得 / 更新設定。
    - 取得 / 更新每日進度。
    - 取得最近 N 天紀錄。
  - 讀寫本機 `progress.json` 檔案。

### 3.2 資料儲存結構（`progress.json`）

{
"settings": {
"codingGoalMinutes": 180,
"readingGoalMinutes": 90,
"writingGoalMinutes": 30
},
"records": {
"2025-12-02": {
"codingMinutes": 120,
"readingMinutes": 60,
"writingMinutes": 30,
"note": "完成 Q8 測試與重構，整理 while 迴圈筆記。"
},
"2025-12-03": {
"codingMinutes": 180,
"readingMinutes": 90,
"writingMinutes": 45,
"note": "開始 Q9，理解浮點數除法的邊界情境。"
}
}
}


- 鍵設計：
  - `settings`：單一物件，儲存全域目標設定。
  - `records`：以日期字串為 key 的物件，值為當日紀錄物件。

---

## 4. API 設計

Base URL（本機開發）：`http://localhost:3000`

### 4.1 設定相關

#### GET `/api/settings`

- 描述：取得目前三個模式的每日目標設定。
- Response 200：

{
"codingGoalMinutes": 180,
"readingGoalMinutes": 90,
"writingGoalMinutes": 30
}


#### POST `/api/settings`

- 描述：更新每日目標設定。
- Request Body：

{
"codingGoalMinutes": 150,
"readingGoalMinutes": 60,
"writingGoalMinutes": 45
}


- Response 200：

{
"success": true
}


### 4.2 進度相關

#### GET `/api/progress?date=YYYY-MM-DD`

- 描述：取得指定日期的紀錄，若不存在則回傳預設值（0 分鐘＋空 `note`）。
- Response 200：

{
"date": "2025-12-02",
"codingMinutes": 120,
"readingMinutes": 60,
"writingMinutes": 30,
"note": "..."
}


#### GET `/api/progress/recent?days=7`

- 描述：取得最近 N 天的紀錄（含當日）。
- Query：
  - `days`（可選，預設 7）。
- Response 200：

{
"records": [
{
"date": "2025-11-26",
"codingMinutes": 90,
"readingMinutes": 30,
"writingMinutes": 15
},
{
"date": "2025-11-27",
"codingMinutes": 180,
"readingMinutes": 60,
"writingMinutes": 30
}
]
}


#### POST `/api/progress`

- 描述：建立或更新單日紀錄。
- Request Body：

{
"date": "2025-12-02",
"codingMinutes": 130,
"readingMinutes": 70,
"writingMinutes": 40,
"note": "今天讓 while 迴圈和 hoisting 概念更穩定。"
}


- Response 200：

{
"success": true
}


- 行為：
  - 讀取 `progress.json`。
  - 若 `records[date]` 已存在則覆寫；否則新增該日期。
  - 寫回檔案。

---

## 5. 前端設計

### 5.1 檔案結構

- `/public/index.html`
- `/public/style.css`
- `/public/app.js`

（或根目錄直放，由實際專案結構決定。）

### 5.2 網頁區塊

#### 5.2.1 Header

- 顯示：
  - 今日日期（格式：`MM 月 DD 日（週X）`）。
  - 小標題：`修煉圈圈` 或 `Practice Rings`。

#### 5.2.2 Timer Section（模式計時器）

- 元件：
  - Mode buttons：
    - 「刷題模式（Coding）」
    - 「閱讀模式（Reading）」
    - 「筆記模式（Writing）」
  - Timer display：
    - 顯示目前模式與已計時時間（`HH:MM:SS`）。
  - Control buttons：
    - Start / Pause / Reset。

- 邏輯：
  - `currentMode`：當前模式。
  - `timerRunning`：boolean。
  - `timerStartTime`：timestamp。
  - `intervalId`：`setInterval` 的 id。

#### 5.2.3 Rings Section（三圈圈）

- 每個模式一個畫面元素：
  - 圓形 UI（可使用 Canvas 或 SVG；初版可用 CSS 圓環）。
  - 中央文字：`已完成 X / Y 分鐘`。
  - 小提示文字（可客製，例如：「再撐一下就關圈了！」）。
- 百分比計算：
  - `progress = min(currentMinutes / goalMinutes, 1)`。

#### 5.2.4 Today Summary Section（今日摘要）

- 元件：
  - 三個數字顯示：
    - Coding / Reading / Writing 分鐘數。
  - `note` 輸入框（多行 textarea）。
  - 「儲存今天」按鈕。

#### 5.2.5 Recent History Section（最近 N 天）

- 元件：
  - 簡易列表或小條圖：
    - 每天一行，顯示日期 + 三個小條／小點（不同顏色對應不同模式）。

---

## 6. 前端狀態與邏輯設計（`app.js`）

### 6.1 主要狀態

const state = {
currentDate: 'YYYY-MM-DD',
currentMode: null, // 'coding' | 'reading' | 'writing' | null
timerRunning: false,
timerStartTime: null,
timerIntervalId: null,
todayMinutes: {
coding: 0,
reading: 0,
writing: 0,
},
goals: {
coding: 180,
reading: 90,
writing: 30,
},
note: '',
};


### 6.2 主要行為（函式概念）

- `init()`
  - 取得今日日期。
  - 呼叫 `fetchSettings()` → 更新 `goals`。
  - 呼叫 `fetchTodayProgress()` → 更新 `todayMinutes` 與 `note`。
  - 呼叫 `renderAll()`。

- `startTimer(mode)`
  - 若 `timerRunning` 為 `true`：
    - 先呼叫 `stopTimer()`，完成上一段計時。
  - 設定 `currentMode = mode`。
  - 設定 `timerStartTime = Date.now()`。
  - 設定 `timerRunning = true`。
  - 啟動 `setInterval(updateTimerDisplay, 1000)`。

- `stopTimer()`
  - 若 `timerRunning` 為 `false` 直接 return。
  - 計算 `elapsedMs` 與 `elapsedMinutes`。
  - 加總到 `todayMinutes[currentMode]`。
  - 清除 interval。
  - 設定 `timerRunning = false`、`currentMode = null`。
  - 呼叫 `renderRings()`。

- `saveToday()`
  - 組成 body：
    - `date`、`codingMinutes`、`readingMinutes`、`writingMinutes`、`note`。
  - 呼叫 `POST /api/progress`。
  - 成功後提示「已儲存」。

- `updateGoals(newGoals)`
  - 更新 `state.goals`。
  - 呼叫 `POST /api/settings`。

---

## 7. 錯誤處理與例外情境

- 後端讀寫錯誤：
  - 若讀檔失敗，回傳 500 與簡潔錯誤訊息。
- 前端呼叫 API 失敗：
  - 顯示提示訊息：「伺服器暫時無法存取，今天的資料先暫存在瀏覽器」。
  - （未來可選）將今日狀態暫存於 localStorage，等待重試。

---

## 8. 未來擴充（Google 試算表）

- 保持 API 介面不變：
  - `/api/settings`、`/api/progress` 等路由簽名不變。
- 儲存層實作：
  - 現在：`FileStorage`（JSON）：
    - `readSettings()` / `writeSettings()`。
    - `readRecords()` / `writeRecords()`。
  - 未來：`GoogleSheetsStorage`：
    - 提供相同介面，只是內部改為呼叫 Google Sheets API。

