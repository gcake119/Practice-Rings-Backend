# Practice Rings（修煉圈圈）SDD

**Version:** 1.3.0  
**Last Updated:** 2025-12-03 20:43 GMT+8  
**Day 1 Update Focus:** 前端 UX 微調 + 鼓勵文案系統 + Toast 通知

---

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
    - v1：本機 JSON 檔（Zeabur Volume）。
    - v2（未來）：Google 試算表（Google Sheets API）。

---

## 2. 功能需求

### 2.1 使用者角色

- Individual Learner（單人使用者）

  - 仍然以「單一使用者」為主，一個部署對應一份個人練習紀錄。

- Login User（登入使用者）
  - 專案現在引入「登入狀態」：
    - 未登入使用者：
      - 只能看到登入畫面／登入區塊。
      - 無法呼叫任何進度相關 API，也不會讀寫 `progress.json`。
    - 已登入使用者：
      - 成功登入後才能呼叫 `/api/settings`、`/api/progress` 相關 API。
      - 所有對 Zeabur Volume 上 `progress.json` 的讀寫都必須經過驗證。
  - 登入方式（v1）：
    - 使用單一共享密碼（或個人 access token）作為保護機制。
    - 前端提供密碼輸入欄位，呼叫 `POST /api/login`。
    - 後端從環境變數（例如 `APP_PASSWORD`）讀取正確密碼：
      - 密碼正確 → 產生一個簽章 token，回傳給前端。
      - 密碼錯誤 → 回傳 401。
    - 目前版本不實作自動登入／記住登入狀態：重新整理頁面或關閉瀏覽器後，使用者需要重新輸入密碼登入。
    - 後端會在讀寫 `progress.json` 前驗證 token，未通過一律回應 401。
  - **【Day 1 更新】載入動畫流程**：
    - 使用者按下「登入」按鈕後 → 顯示「鈴鐺轉圈圈」loading 動畫。
    - 後端驗證密碼＋產生 token → 回傳成功 → 隱藏 loading。
    - 前端呼叫 `init()` 載入設定＋紀錄 → 完成後顯示主畫面。
    - 若任何步驟失敗 → 隱藏 loading 並用 **toast** 顯示錯誤訊息。

> 註：這個版本仍是「單人工具」，只是加了一層鎖，未來若要支援多使用者，可以在這一層上再擴充 userId。

### 2.2 核心功能

#### 2.2.1 日常進度追蹤（三圈圈）

- 三個圈圈代表每日累積的實作時間：
  - Coding Ring：
    - 追蹤當日「刷題 / 寫測試 / 重構」累積分鐘數。
  - Reading Ring：
    - 追蹤當日「系統性閱讀技術文件 / 書籍」累積分鐘數。
  - Writing Ring：
    - 追蹤當日「撰寫技術筆記」累積分鐘數。
- 每個圈圈顯示：
  - 百分比：已完成分鐘數 / 目標分鐘數（最大 100％）。
  - 數字：`current / goal`（分鐘）。
  - **【Day 1 新增】總時數與鼓勵文案**：
    - 三項目總和時數 = `codingMinutes + readingMinutes + writingMinutes`。
    - 以 **6 小時（360 分鐘）為 100% 目標** 換算總完成度百分比。
    - 依完成度區間顯示不同的 **Doraemon 角色勵志台詞**。
    - 例如：
      - 0–30%：「沒關係啦！只要有開始，就是很棒的第一步喔！」
      - 31–70%：「別急著失望嘛，重要的是你已經開始走在正確的軌道上了！」
      - 71–99%：「差一點就成功啦！再加一點點力氣，你的未來就會亮得像小叮鈴一樣！」
      - 100%+：「太棒了！像這樣一步一步堅持下去，你一定能做出屬於自己的道具喔！✨」

#### 2.2.2 模式計時器（Timer Modes）

- 可選擇當前工作模式：
  - Coding / Reading / Writing。
- 操作流程：
  - 選擇模式。
  - Start：開始計時該模式。
  - Pause：
    - 暫停當前計時，時間停在畫面上。
    - 按鈕文字改為「結束 Stop」。
  - Stop（在暫停狀態再次按同一顆按鈕）：
    - 結束本段計時，將本段分鐘數加到當日該模式累積。
    - 自動呼叫後端 API，儲存當前累積時間（不包含 note）。
- 切換模式：
  - 若有尚未結束的計時（正在跑或暫停中）：
    - 先結束並累加上一段計時（同 Stop 行為，並自動儲存時間）。
    - 再切換為新模式，時間歸零，等待 Start。
- 計算規則：
  - 每段時間的起點：`timerStartTime`（timestamp）。
  - 每次更新顯示：
    - `elapsedMs = timerPausedElapsedMs + (now - timerStartTime)`。
  - 結束時計算：
    - `elapsedMinutes = floor(timerPausedElapsedMs / 60000)`。
    - `todayMinutes[mode] += elapsedMinutes`。
    - `timerPausedElapsedMs` 歸零。

#### 2.2.3 每日紀錄管理

- 今日資料結構：

  - `date`: `YYYY-MM-DD`。
  - `codingMinutes`: number。
  - `readingMinutes`: number。
  - `writingMinutes`: number。
  - `note`: string（可簡短描述今日重點）。

- 功能：

  - 載入頁面時：
    - 若已登入：
      - 從後端取得今天紀錄。
      - 若不存在，回傳預設值（0 分鐘＋空 note）。
    - 若未登入：
      - 不呼叫任何進度 API，只顯示登入畫面。
  - 模式計時器：
    - 每結束一段計時，會自動更新該模式累積分鐘數並立即同步到後端（僅時間，不包含 note）。
  - 手動輸入時間區間：

    - 使用者可以在「今日摘要」區塊中，針對每個模式輸入多段時間區間：
      - 介面：`startTime` 與 `endTime`，格式為 `HH:MM`。
      - 範例：`09:30` → `10:15` 代表 45 分鐘。
    - 前端行為：
      - 檢查 `endTime` 是否晚於 `startTime`，否則用 **toast** 顯示錯誤訊息。
      - 將時間字串換算成分鐘差 `deltaMinutes`。
      - 將 `deltaMinutes` 累加到對應的 `todayMinutes[mode]`。
      - 呼叫 `saveTodayMinutesOnly()`，把最新的分鐘數同步到後端（不動 note）。
      - **【Day 1 新增】成功後清空輸入欄位**，並用 toast 提示「已加入」。
    - 手動輸入與計時器的關係：
      - 計時器結束時會自動儲存該段時間。
      - 手動輸入完成時也會儲存。
      - 後端只關心每天三種模式的分鐘總和，不追蹤每段起訖。

  - 儲存今天（含 note）：
    - 按「儲存今天 Save Today / 修改並儲存 Update & Save」按鈕時：
      - 若仍有尚未結束或暫停中的計時，會先結束並累加＋自動儲存時間。
      - 然後用「完整 body（時間＋ note）」呼叫後端，覆寫當日紀錄。
      - 成功則用 toast 提示「今日紀錄已儲存」。
      - 失敗則用 toast 提示「儲存失敗，請稍後重試」。

- 儲存按鈕文字：
  - 若 `note` 為空字串或全空白：
    - 顯示「儲存今天 Save Today」。
  - 若已有內容：
    - 顯示「修改並儲存 Update & Save」。

#### 2.2.4 歷史紀錄檢視（Recent Rings）

- **【Day 1 大改動】新增「卡片 + 月曆展開」設計**：

  - 預設顯示：
    - 一個「最近 7 天」卡片，固定顯示最近七天的橫向同心圓小圈圈。
    - 無 x 軸滑動，一次清楚看完最近一週。
  - 點擊卡片後展開為月曆模式：
    - 改為按「月份」顯示完整行事曆。
    - 格子排列：每列 7 天（週一作為第一欄）。
    - 每一格內仍是三合一同心圓代表那一天的進度。
    - 使用者可以透過「上月 / 下月」導航按鈕切換月份檢視。
  - 返回預設視圖：
    - 再次點擊展開的卡片或按「收合」按鈕，回到「最近 7 天」簡介模式。

- 每天顯示內容：
  - 日期標籤：預設模式顯示 `MM-DD`；月曆模式顯示 `DD`。
  - 三合一同心圓：
    - 外圈：Coding 完成度（紅色）。
    - 中圈：Reading 完成度（綠色）。
    - 內圈：Writing 完成度（橙色）。

#### 2.2.5 目標設定（Goals）

- 每個模式有獨立目標分鐘數：
  - **【Day 1 更新】調整默認目標值及結構**：
    - 可在前端 `app.js` 的 `state.goals` 中直接修改，例如：
      - `codingGoalMinutes`: 預設 180（可調為其他值如 150、120）
      - `readingGoalMinutes`: 預設 90（可調為 60、75）
      - `writingGoalMinutes`: 預設 30（可調為 45、60）
    - 未來可考慮增加設定頁面讓使用者在前端修改並呼叫 `/api/settings` 保存。
- 使用者目前僅能透過後端 JSON 或直接修改前端 `state.goals` 調整（v1 未提供 UI 介面）。
- 百分比計算：
  - `progress = min(currentMinutes / goalMinutes, 1)`。
  - 用於：
    - 今日三大圈圈。
    - 最近 7 天及月曆小圈圈。
  - 三項目總完成度（新增）：
    - `totalPercentage = (codingMinutes + readingMinutes + writingMinutes) / 360 * 100`（以 6 小時為基準）。

### 2.3 非功能性需求

- 簡單部署：
  - 前端：可部署在 GitHub Pages。
  - 後端：可部署於 Zeabur（使用 Volume 持久化 JSON）。
- 響應式設計：
  - 以手機直向瀏覽為主（iPhone 尺寸優先）。
  - 參考 Apple 健康 App 的卡片設計風格。
  - 桌機寬版保持居中。
- **【Day 1 新增】字型優化**：
  - 改用開源的 JustFont 粉圓體（jf-openhuninn），解決漏字問題。
  - 支援台灣繁體中文完整字集。
- 離線友好（未來加分）：
  - 若後端暫時無法連線，可考慮將今日狀態暫存於 localStorage，之後再補同步。

---

## 3. 系統架構設計

### 3.1 整體架構

- Client（Browser）：

  - `index.html` / `style.css` / `app.js`。
  - 負責：
    - UI 呈現（Doraemon 蠟筆風格＋粉圓體字型）。
    - 模式計時器與手動時間區間輸入。
    - 三圈圈與最近 7 天同心圓繪製 + 月曆切換。
    - 登入狀態管理：
      - 維護 `isAuthenticated` 與 `token`。
      - 將 token 儲存在 `localStorage`。
      - 未登入時只顯示登入區塊，不呼叫進度相關 API。
    - 呼叫後端 API，同步目標設定與每日進度（所有請求都附帶 Authorization header）。
    - **【Day 1 新增】所有操作提示改用 Toast 通知**（移除 `alert()` 與原生 confirm）。

- Server（Node.js + Express）：
  - `server.js`。
  - RESTful API：
    - 身分驗證：
      - `POST /api/login`。
    - 取得 / 更新設定（每日目標）。
    - 取得 / 更新每日進度（時間＋ note）。
    - 取得最近 N 天紀錄。
  - Auth middleware：
    - 驗證來自前端的 `Authorization: Bearer <token>`。
    - 未通過驗證者，一律回應 401 並拒絕讀寫 `progress.json`。
  - 讀寫 Zeabur Volume 上的 `progress.json` 檔案。

### 3.2 資料儲存結構（`progress.json`）

```json
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
```

- key 設計：
  - `settings`：單一物件，儲存全域目標設定。
  - `records`：以日期字串為 key 的物件，每一個 value 是該日紀錄物件。

---

## 4. API 設計

Base URL（本機開發）：`http://localhost:3000`  
Base URL（正式環境）：`https://<your-zeabur-domain>.zeabur.app`

### 4.0 身分驗證相關

#### POST `/api/login`

- 描述：使用密碼登入，取得存取 token。
- Request Body：

```json
{
  "password": "user-input-password"
}
```

- 行為：

  - 從環境變數（例如 `APP_PASSWORD`）讀取正確密碼。
  - 若 `password` 相符：
    - 產生一個簽章 token（具備到期時間或隨機性）。
    - 回傳 `{ "token": "<signed-token>" }`。
  - 若不相符：
    - 回傳 401 與錯誤訊息。

- Response 200：

```json
{
  "token": "<signed-token>"
}
```

### 4.1 設定相關

#### GET `/api/settings`

- 描述：取得目前三個模式的每日目標設定。
- Response 200：

```json
{
  "codingGoalMinutes": 180,
  "readingGoalMinutes": 90,
  "writingGoalMinutes": 30
}
```

#### POST `/api/settings`

- 描述：更新每日目標設定。
- Request Body：

```json
{
  "codingGoalMinutes": 150,
  "readingGoalMinutes": 60,
  "writingGoalMinutes": 45
}
```

- 行為：
  - 覆寫 `settings` 物件中對應欄位。
- Response 200：

```json
{
  "success": true
}
```

### 4.2 進度相關

#### GET `/api/progress?date=YYYY-MM-DD`

- 描述：取得指定日期的紀錄，若不存在則回傳預設值。
- Response 200（若無紀錄）：

```json
{
  "date": "2025-12-02",
  "codingMinutes": 0,
  "readingMinutes": 0,
  "writingMinutes": 0,
  "note": ""
}
```

#### GET `/api/progress/recent?days=7`

- 描述：取得最近 N 天的紀錄（含當日）。
- Query：
  - `days`（可選，預設 7）。
- Response 200：

```json
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
```

- 行為：
  - 由當日往前數 N 天。
  - 對每一天：
    - 若 `records[date]` 存在，採用其分鐘數。
    - 若不存在，回傳 `0` 並帶上 `date`。

#### POST `/api/progress`

- 描述：建立或更新單日紀錄。
- Request Body：

```json
{
  "date": "2025-12-02",
  "codingMinutes": 130,
  "readingMinutes": 70,
  "writingMinutes": 40,
  "note": "今天讓 while 迴圈和 hoisting 概念更穩定。"
}
```

- Request Body（自動儲存時間用，不含 note）：

```json
{
  "date": "2025-12-02",
  "codingMinutes": 130,
  "readingMinutes": 70,
  "writingMinutes": 40
}
```

- 行為：
  - 讀取 `progress.json`。
  - 若 `records[date]` 已存在：
    - 以 Request Body 中提供的分鐘數覆寫原本的 `codingMinutes` / `readingMinutes` / `writingMinutes`。
    - 若 body 中有 `note` 欄位，覆寫原本 note；若沒有 `note` 欄位，保留既有 note。
  - 若 `records[date]` 不存在：
    - 建立新的紀錄物件。
  - 寫回檔案。
- Response 200：

```json
{
  "success": true
}
```

### 4.3 其餘 API 的授權規則

以下路由皆為「受保護路由」，必須攜帶 `Authorization` header：

- GET `/api/settings`
- POST `/api/settings`
- GET `/api/progress?date=YYYY-MM-DD`
- GET `/api/progress/recent?days=7`
- POST `/api/progress`

共通授權規則：

- Request header 需包含：

```
Authorization: Bearer <token>
```

- 伺服器會在進入 handler 前驗證 token：
  - 驗證失敗或未提供 → 回傳 401，且不進行任何檔案讀寫。
  - 驗證成功 → 執行原本邏輯。

---

## 5. 前端設計

### 5.1 檔案結構

```
/
├── index.html
├── style.css
├── app.js
├── assets/
│   ├── apple-touch-icon.png
│   ├── favicon-32.png
│   ├── favicon-16.png
│   └── fonts/
│       └── jf-openhuninn-1.0.woff2  (【Day 1 新增】粉圓體字檔)
├── docs/
│   └── SDD.md
└── README.md
```

### 5.2 網頁區塊

#### 5.2.0 Login Section（新增）

- 元件：
  - 密碼輸入欄位（`<input type="password">`）。
  - 「登入 Login」按鈕。
  - 「鈴鐺轉圈圈」loading 動畫容器（預設隱藏）。
- 行為：

  - 使用者輸入密碼後按下登入：
    - **顯示 loading 動畫**（鈴鐺轉圈圈）。
    - 呼叫 `POST /api/login`。
    - 成功：
      - 隱藏 loading。
      - 前端於登入成功後將 token 存入前端狀態，並於本次瀏覽會話期間附帶在 API header 中，重新整理後需重新登入。
      - 設定 `state.isAuthenticated = true`。
      - 呼叫 `init()` 載入設定與今日／歷史紀錄。
      - 頁面轉為主畫面（Timer / Rings / Summary / History）。
    - 失敗：
      - 隱藏 loading。
      - 用 **toast** 顯示錯誤提示（例如「密碼錯誤」）。

- 顯示邏輯：
  - `isAuthenticated === false`：
    - 僅顯示登入區塊（Timer / Rings / Summary / History 隱藏）。
  - `isAuthenticated === true`：
    - 顯示完整主畫面。

#### 5.2.1 Header

- 顯示：
  - 今日日期（格式：`MM 月 DD 日（週X）`）。
  - 小標題：`修煉圈圈 Practice Rings`。

#### 5.2.2 Timer Section（模式計時器）

- 元件：
  - Mode buttons：
    - 「刷題模式 Coding」
    - 「閱讀模式 Reading」
    - 「筆記模式 Writing」
  - Timer display：
    - 目前模式文字。
    - 已計時時間（`HH:MM:SS`）。
  - Control buttons：
    - Start：開始計時。
    - Pause / Stop（同一顆）：
      - 正在計時 → 按下變「暫停」，時間停止。
      - 暫停中 → 按下變「結束」，累加本段時間。
    - Reset：只重設畫面計時器，不影響已累積分鐘數。
- 邏輯：
  - `currentMode`：當前模式。
  - `timerRunning`：boolean。
  - `timerStartTime`：timestamp。
  - `timerIntervalId`：`setInterval` 的 id。
  - `timerPausedElapsedMs`：已累積但尚未結束的毫秒數。

#### 5.2.3 Rings Section（三圈圈）

- 每個模式一個主圈：
  - 圓形 UI（CSS conic-gradient 實作類似 Apple Watch 的圈圈）。
  - 中央文字：
    - `XX%`（完成百分比）。
  - 圈圈下方文字：
    - `已完成 X / Y 分鐘`。

#### 5.2.4 Encouragement Section（【Day 1 新增】鼓勵訊息）

- 顯示位置：三圈圈下方或今日摘要上方。
- 元件：
  - 三項目總時數顯示：`總計 X 分鐘`。
  - 總完成度百分比：`基於 6 小時目標`。
  - **Doraemon 勵志台詞**（動態根據完成度更新）。
- 行為：
  - 實時計算 `totalPercentage = (codingMinutes + readingMinutes + writingMinutes) / 360 * 100`。
  - 依百分比區間顯示對應台詞（見 2.2.1 說明）。
  - 每當三項目時數更新（計時器結束 / 手動輸入成功）時，即時刷新台詞。
- 「勵志文案的更新時機：
  - 每當三個模式的今日分鐘數更新（包含計時器結束一段修煉、手動輸入時間成功加入、從後端重新載入今日紀錄）時，前端會呼叫統一的 `updateProgressUI()`，即時刷新：
    - 三個主圈圈的百分比與 `current / goal` 顯示。
    - 總時數三色進度條與完成百分比。
    - 總體與各模式的 Doraemon 勵志台詞。
  - 「儲存今天」按鈕僅負責將目前狀態寫回後端與更新歷史紀錄，不再作為勵志台詞更新的觸發點。」

#### 5.2.5 Today Summary Section（今日摘要）

- 元件（上層）：
  - 三個數字顯示：
    - Coding / Reading / Writing 分鐘數。
  - `note` 輸入框（多行 textarea）。
  - 儲存按鈕：
    - 若 note 為空白（trim 後長度為 0）：
      - 顯示「儲存今天 Save Today」。
    - 若 note 有內容：
      - 顯示「修改並儲存 Update & Save」。
- 元件（下層 - 【Day 1 新增】手動時間輸入）：
  - 標題：「手動新增時間」或「補充時間區間」。
  - 三個模式各有一組時間區間輸入：
    - `startTime`：`<input type="time">`，格式 `HH:MM`。
    - 至 `-` 或 `to` 文字。
    - `endTime`：`<input type="time">`，格式 `HH:MM`。
    - 「加入時間」按鈕。
- 行為（上層）：
  - 按下按鈕：
    - 若有未結束或暫停中的計時，先完成本段計時（累加分鐘＋自動儲存時間）。
    - 使用完整 body（包含 note）呼叫 `/api/progress`。
    - 成功：用 **toast** 提示「今日紀錄已儲存 ✓」。
    - 失敗：用 **toast** 提示「儲存失敗，請稍後重試 ✗」。
    - 更新最近 7 天歷史畫面。
- 行為（下層）：
  - 讀取 `startTime` / `endTime`。
  - 檢查 `endTime > startTime`：
    - 否 → 用 **toast** 顯示「結束時間需晚於開始時間」。
    - 是 → 計算分鐘差，累加至 `todayMinutes[mode]`。
  - 呼叫 `saveTodayMinutesOnly()` 將分鐘數同步到後端。
  - 成功：
    - 用 **toast** 提示「已加入 XX 分鐘」。
    - **【Day 1 新增】清空該模式的輸入欄位**（`startTime` 與 `endTime` 回復為空）。
  - 失敗：
    - 用 **toast** 提示「儲存失敗，請稍後重試」。
  - 重新渲染今日數字、三圈圈、鼓勵文案。

#### 5.2.6 Recent History Section（【Day 1 大改動】最近 N 天 + 月曆）

- **預設視圖**：

  - 顯示「最近 7 天」卡片。
  - 內部：7 個小同心圓排成一列（水平排列）。
  - 無 x 軸滑動，頁面自適應寬度一次展示完整。
  - 每個小圈圈上方標籤：`MM-DD` 格式。
  - 卡片標題：「最近 7 天練習進度」。
  - 可點擊卡片進入「月曆展開」模式。

- **月曆展開視圖**：

  - 點擊卡片後，轉換為月曆顯示。
  - 上方導航：「上月」按鈕 + 「12 月 2025」（或當前月份）+ 「下月」按鈕。
  - 行事曆格子：
    - 每列 7 天（週一作為第一欄，用中文「一二三四五六日」表示）。
    - 按月份展開，灰顯上月與下月日期。
  - 每一格內容：
    - 日期數字（`DD`）。
    - 三合一同心圓（外圈 coding、中圈 reading、內圈 writing）。
  - 收合按鈕或再次點擊卡片返回「最近 7 天」視圖。

- 每天顯示的三合一同心圓：
  - 外圈：Coding 完成度（紅色 conic-gradient）。
  - 中圈：Reading 完成度（綠色 conic-gradient）。
  - 內圈：Writing 完成度（橙色 conic-gradient）。
  - 圈圈下方或內部顯示日期。

#### 5.2.7 Toast 提示

- **【Day 1 新增】所有操作改用 Toast 通知**：
  - 浮動提示框，顯示於右下角或下方中央。
  - 自動在 2 ～ 3 秒後消失。
  - 不阻斷使用者操作。
- 提示類型：
  - 成功：「已加入 XX 分鐘」、「今日紀錄已儲存」。
  - 錯誤：「結束時間需晚於開始時間」、「密碼錯誤」、「儲存失敗」。
  - 資訊：「計時結束，已自動儲存」。

---

## 6. 前端狀態與邏輯（`app.js`）

### 6.1 主要狀態

```javascript
const state = {
  currentDate: "",
  currentMode: null,
  timerRunning: false,
  timerStartTime: null,
  timerIntervalId: null,
  timerPausedElapsedMs: 0,
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
  note: "",
  recentRecords: [],
  isAuthenticated: false,
  token: "",
  manualTime: {
    coding: { start: "", end: "" },
    reading: { start: "", end: "" },
    writing: { start: "", end: "" },
  },
  historyViewMode: "recent7", // 'recent7' 或 'calendar'
  currentCalendarDate: new Date(), // 用於月曆導航
};
```

### 6.2 主要函式與流程

- **`login(password)`**

  - 顯示 loading 動畫。
  - 呼叫 `POST /api/login`。
  - 成功：
    - 隱藏 loading。
    - 寫入 `state.token` 與 `localStorage`。
    - 設定 `state.isAuthenticated = true`。
    - 呼叫 `init()`。
  - 失敗：
    - 隱藏 loading。
    - 用 toast 顯示「密碼錯誤」或「登入失敗」。

- **`init()`**

  - 取得今日日期並填入 `state.currentDate`。
  - 呼叫 `fetchSettings()` 更新 `state.goals`。
  - 呼叫 `fetchTodayProgress()` 更新 `state.todayMinutes` 與 `state.note`。
  - 呼叫 `fetchRecentProgress(7)` 取得最近 7 天紀錄。
  - 呼叫 `renderAll()`：
    - 顯示日期、今日圈圈、摘要、鼓勵文案與歷史小圈圈。
  - 隱藏 Loading 畫面，顯示主內容。
  - 若任一步驟失敗，顯示錯誤提示並隱藏 Loading。

- **`fetchSettings()`**

  - GET `/api/settings`（附帶 Authorization header）。
  - 將回傳值寫入 `state.goals`。

- **`fetchTodayProgress()`**

  - GET `/api/progress?date=${currentDate}`（附帶 Authorization header）。
  - 將回傳 `codingMinutes` / `readingMinutes` / `writingMinutes` 寫入 `state.todayMinutes`。
  - 將回傳 `note` 寫入 `state.note`。

- **`fetchRecentProgress(days)`**

  - GET `/api/progress/recent?days=${days}`（附帶 Authorization header）。
  - 將回傳的 `records` 陣列寫入 `state.recentRecords`。

- **`saveTodayFull()`**

  - 組成 body：
    - `date`、`codingMinutes`、`readingMinutes`、`writingMinutes`、`note`。
  - POST `/api/progress`（附帶 Authorization header）。
  - 成功：用 toast 提示「今日紀錄已儲存」，並刷新歷史。
  - 失敗：用 toast 提示「儲存失敗」。
  - 用於「儲存今天」按鈕。

- **`saveTodayMinutesOnly()`**

  - 組成 body（不含 `note`）：
    - `date`、`codingMinutes`、`readingMinutes`、`writingMinutes`。
  - POST `/api/progress`（附帶 Authorization header）。
  - 成功：用 toast 提示「自動儲存成功」。
  - 失敗：用 toast 提示「自動儲存失敗，請稍後重試」（但不中斷流程）。
  - 用於每一段計時結束時自動同步時間。

- **`showToast(message, type = 'info')`** 【Day 1 新增】

  - 參數：
    - `message`：提示文字。
    - `type`：`'success'` / `'error'` / `'info'`。
  - 行為：
    - 建立一個 `<div class="toast toast--{type}">`。
    - 塞入 `message` 文字。
    - Append 到 `#toast-root` 容器。
    - 用 `setTimeout` 在 2~3 秒後移除節點。
  - 用於所有操作提示（移除 `alert()`）。

- **`calculateEncouragement()`** 【Day 1 新增】

  - 計算 `totalPercentage = (state.todayMinutes.coding + state.todayMinutes.reading + state.todayMinutes.writing) / 360 * 100`。
  - 根據百分比區間選擇 Doraemon 角色台詞。
  - 回傳：`{ percentage, message }`。

- **`getEncouragementMessage(percentage)`** 【Day 1 新增】

  - 定義一個勵志文案 mapping 物件：
    ```javascript
    const messages = {
      zero: "大雄～今天還沒開始呢！先跨出第一步吧，未來可是在等著你喔！",
      low: "別氣餒嘛，大雄。努力一點點累積起來，也會變成大大的力量喔！",
      medium: "不錯喔！再加把勁，離今天的目標越來越近了！我相信你可以的！",
      high: "哇～快完成了！保持這個節奏，大雄你真的越來越可靠了！",
      maxed: "太棒了！今天的你根本是『未來的大雄』等級！真的做得很好！",
    };
    ```
  - 根據 percentage 回傳對應台詞。

- **`setMode(mode)`**

  - 若已有正在跑或暫停中的計時（`timerRunning` 或 `timerPausedElapsedMs > 0`）：
    - 呼叫 `pauseOrStopTimer()` 結束上一段計時並累加＋自動儲存時間。
  - 設定：
    - `state.currentMode = mode`。
    - 重置計時器相關狀態（`timerPausedElapsedMs = 0` 等）。
  - 更新畫面：
    - 顯示「目前模式：XXX」。
    - 計時器顯示重置為 `00:00:00`。
    - 暫停按鈕文字重設為「暫停 Pause」。
    - 按鈕高亮對應模式。

- **`startTimer()`**

  - 若 `currentMode` 為 null → 用 toast 提示「請先選擇模式」。
  - 若 `timerRunning` 已為 true → 直接返回。
  - 設定：
    - `timerRunning = true`。
    - `timerStartTime = Date.now()`。
    - 以 `setInterval(updateTimerDisplay, 1000)` 每秒更新畫面。
  - 更新畫面文字：
    - `timerPauseButton` 文字為「暫停 Pause」。
    - 標籤顯示「計時中：XXX」。

- **`updateTimerDisplay()`**

  - 若未在計時或未設定 `timerStartTime` 則直接返回。
  - 計算：
    - `elapsedMs = timerPausedElapsedMs + (now - timerStartTime)`。
    - 將格式化後的 `HH:MM:SS` 顯示於計時器。

- **`pauseOrStopTimer()`**

  - 情境 1：尚未開始任何模式與計時 → 直接返回。
  - 情境 2：正在跑（`timerRunning === true`）：
    - 計算本輪毫秒數並加到 `timerPausedElapsedMs`。
    - 停止計時（清除 interval，設 `timerRunning = false`）。
    - 更新顯示時間為 `timerPausedElapsedMs`，標記為「暫停中：XXX」。
    - 將暫停按鈕文字改為「結束 Stop」。
  - 情境 3：已暫停（`timerRunning === false` 且 `currentMode` 不為 null 且 `timerPausedElapsedMs > 0`）：
    - 計算本段分鐘數 `elapsedMinutes = floor(timerPausedElapsedMs / 60000)`。
    - 把 `elapsedMinutes` 累加到 `state.todayMinutes[currentMode]`。
    - 呼叫 `saveTodayMinutesOnly()` 自動儲存（只上傳時間，不影響 note）。
      - 若失敗則使用 `showToast()` 呈現小提示，但不影響流程。
    - 重置計時相關狀態（`timerPausedElapsedMs = 0`，`currentMode = null`，`timerRunning = false` 等）。
    - 用 toast 提示「計時結束，已自動儲存」。
    - 更新畫面（計時器歸零、按鈕恢復預設）。
    - 重新渲染三圈圈與鼓勵文案。

- **`resetTimerOnly()`**

  - 重置計時器時間為 00:00:00，不影響今日累積分鐘數。
  - 清除 interval 等。

- **`addManualTime(mode)`** 【Day 1 改進】

  - 讀取 `state.manualTime[mode].start` / `end`。
  - 檢查 `end > start`：
    - 否 → 用 toast 提示「結束時間需晚於開始時間」，直接返回。
    - 是 → 繼續。
  - 轉換為分鐘差 `deltaMinutes`。
  - 累加到 `state.todayMinutes[mode]`。
  - 呼叫 `saveTodayMinutesOnly()`。
  - 成功：
    - 用 toast 提示「已加入 ${deltaMinutes} 分鐘」。
    - **清空輸入欄位**：`state.manualTime[mode] = { start: '', end: '' }`。
  - 失敗：
    - 用 toast 提示「儲存失敗，請稍後重試」。
  - 重新渲染今日數字、三圈圈、鼓勵文案、歷史記錄。

- **`renderAll()`**

  - 呼叫子函式依序更新所有區塊：
    - 日期標籤。
    - 三個主圈圈。
    - 今日摘要。
    - 鼓勵文案（新增）。
    - 最近 7 天同心圓小圈圈（或月曆）。

- **`renderRings()`**

  - 畫三大圈圈。
  - 百分比採用 `conic-gradient`，中央顯示已完成百分比文字與進度。

- **`renderHistory()`** 【Day 1 改進】

  - 依 `state.historyViewMode` 判斷顯示方式：
    - `'recent7'`：用 `state.recentRecords` 橫向繪出 7 顆小同心圓。
    - `'calendar'`：繪出當月行事曆（週一至日），填入對應日期的圈圈。
  - 小同心圓排列：
    - 外圈紅：coding。
    - 中圈綠：reading。
    - 內圈橙：writing。
  - 圈圈上方顯示日期（`recent7` 模式：`MM-DD`；`calendar` 模式：`DD`）。

- **`toggleHistoryView()`** 【Day 1 新增】

  - 切換 `state.historyViewMode` 在 `'recent7'` 與 `'calendar'` 之間。
  - 重新渲染歷史區塊。

- **`updateSaveButtonLabel()`**

  - 根據 `state.note` 內容決定「儲存今天」按鈕文字：
    - 空白則標「儲存今天 Save Today」。
    - 有內容則標「修改並儲存 Update & Save」。

- **其他**：
  - todayNote textarea 綁定 input 事件，及時同步 `state.note` 與按鈕文字。
  - 儲存按鈕點擊時：
    - 自動先結束本日所有未停計時段。
    - 執行完整儲存（時間＋ note），成功時給予成功提示並刷新歷史記錄。
  - 所有 fetch 呼叫補上 Authorization header：
    ```javascript
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
    };
    ```

---

## 7. 錯誤處理與例外情境

- 後端讀寫錯誤：
  - 伺服器回應 500 → 用 toast 顯示「伺服器暫時無法存取」。
  - API 失敗 fallback → 重要提示使用 toast 呈現，不中斷流程。
- 前端呼叫 API 失敗：
  - 重要失敗（全部資料載入不了）：
    - loading 畫面維持，顯示明確 toast 提示。
  - 非致命錯誤（auto save 失敗）：
    - 只用 `showToast()` 提示，下一輪自動儲存時再重試。
- 未授權（401）：
  - 若 API 回應 401 → 清除 `localStorage` token 與 state。
  - 用 toast 提示「登入已過期，請重新登入」。
  - 頁面導回登入畫面。
- （未來）離線儲存：
  - 若 API call 失敗，可暫存於 `localStorage`，網路恢復時自動補送。

---

## 8. CSS 設計亮點（【Day 1 新增】）

### 8.1 字型設定

```css
@font-face {
  font-family: "jf-openhuninn";
  src: url("/assets/fonts/jf-openhuninn-1.0.woff2") format("woff2");
  font-weight: normal;
  font-style: normal;
}

body {
  font-family: "jf-openhuninn", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
}
```

### 8.2 手機版歷史卡片

```css
.history-card {
  /* 最近 7 天卡片 */
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: nowrap;
  overflow: visible;
  /* 不使用 overflow-x: scroll */
}

.history-card__ring {
  flex-shrink: 0;
  width: 60px;
  height: 80px;
  text-align: center;
}

.history-card--calendar {
  /* 月曆模式 */
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin: 0 auto;
}

.calendar-grid__cell {
  width: 50px;
  height: 70px;
  text-align: center;
}

.calendar-grid__cell--other-month {
  opacity: 0.3;
}
```

---

## 9. 未來擴充

### 9.1 目標設定前端 UI

- 在設定頁面讓使用者直接調整三個模式的每日目標時數。
- 呼叫 `/api/settings` 保存到後端。

### 9.2 多使用者登入機制

- 保持所有 API 介面不變。
- 初始版僅允許單人使用。
- 未來版本可考慮 OAuth / Google 帳號快速登入。

### 9.3 後端資料搬遷至 Google Sheets

- 儲存邏輯封裝在 Storage 服務。
- 改為後端以 Google Sheets API 做新增、更新、查詢。

### 9.4 其他可能強化方向

- UI 支援自訂主題配色。
- RWD for 平板與大螢幕。
- 完整單元測試 coverage 與 CI/CD。
- 每日計時紀錄按段落拆開顯示。

---

## 10. 開發優先順序建議（Day 1 Focus）

### Phase 1（核心功能 - 已完成）

- ✅ 登入系統 + token 管理
- ✅ 三圈圈追蹤
- ✅ 計時器 (Start / Pause / Stop)
- ✅ 最近 7 天歷史顯示

### Phase 2（【Day 1】UX 微調 - 進行中）

1. **Toast 通知系統**
   - 移除所有 `alert()` → 改用 `showToast()`
   - 實作約 50 行的極簡 toast 元件
2. **手動時間輸入清空**
   - 在 `addManualTime()` 成功後清空 input 值
   - 測試邊界情境（時間驗證）
3. **Doraemon 勵志文案系統**
   - 定義 messaging mapping 物件
   - 實作 `calculateEncouragement()` 與 `getEncouragementMessage()`
   - UI 在鼓勵區塊動態更新文案
4. **粉圓體字型載入**
   - 下載 jf-openhuninn-1.0.woff2 放進 `/assets/fonts/`
   - 更新 CSS `@font-face` 與 `font-family`
5. **歷史卡片展開 (最近 7 天 → 月曆)**
   - 實作 `toggleHistoryView()` 切換邏輯
   - CSS grid 排列月曆格子（週一至日）
   - 新增上月 / 下月導航按鈕

### Phase 3（可調整目標 - 日後）

- 目標設定前端 UI 頁面
- 呼叫 `/api/settings` 保存

---

（本規格書為 2025-12-03 依 Day 1 實際使用更新，所有修改遵循 Airbnb 風格指南。）
