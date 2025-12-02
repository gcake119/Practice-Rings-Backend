require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 本機開發用專案根目錄，Zeabur 上用環境變數指定的路徑
const DATA_FILE_PATH =
  process.env.DATA_FILE_PATH || path.join(__dirname, 'progress.json');

// Middleware
app.use(cors());
app.use(express.json());

// 輔助：讀取 JSON 檔
function readDataFile() {
  try {
    const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.settings) {
      data.settings = {
        codingGoalMinutes: 180,
        readingGoalMinutes: 90,
        writingGoalMinutes: 30,
      };
    }
    if (!data.records) {
      data.records = {};
    }
    return data;
  } catch (err) {
    // 若檔案不存在或壞掉，建立預設結構
    return {
      settings: {
        codingGoalMinutes: 180,
        readingGoalMinutes: 90,
        writingGoalMinutes: 30,
      },
      records: {},
    };
  }
}

// 輔助：寫入 JSON 檔
function writeDataFile(data) {
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// 取得設定
app.get('/api/settings', (req, res) => {
  try {
    const data = readDataFile();
    res.json(data.settings);
  } catch (err) {
    console.error('讀取設定失敗:', err);
    res.status(500).json({
      error: '伺服器錯誤',
      message: '無法讀取設定',
    });
  }
});

// 更新設定
app.post('/api/settings', (req, res) => {
  try {
    const { codingGoalMinutes, readingGoalMinutes, writingGoalMinutes } = req.body;

    const data = readDataFile();

    data.settings = {
      codingGoalMinutes: Number(codingGoalMinutes) || data.settings.codingGoalMinutes,
      readingGoalMinutes: Number(readingGoalMinutes) || data.settings.readingGoalMinutes,
      writingGoalMinutes: Number(writingGoalMinutes) || data.settings.writingGoalMinutes,
    };

    writeDataFile(data);

    res.json({ success: true });
  } catch (err) {
    console.error('更新設定失敗:', err);
    res.status(500).json({
      error: '伺服器錯誤',
      message: '無法更新設定',
    });
  }
});

// 取得指定日期的進度
app.get('/api/progress', (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        error: '缺少參數',
        message: '請提供 date，例如 /api/progress?date=2025-12-02',
      });
    }

    const data = readDataFile();
    const record = data.records[date] || {
      date,
      codingMinutes: 0,
      readingMinutes: 0,
      writingMinutes: 0,
      note: '',
    };

    res.json(record);
  } catch (err) {
    console.error('取得進度失敗:', err);
    res.status(500).json({
      error: '伺服器錯誤',
      message: '無法取得進度',
    });
  }
});

// 取得最近 N 天的進度
app.get('/api/progress/recent', (req, res) => {
  try {
    const days = Number(req.query.days) || 7;
    const today = new Date();
    const data = readDataFile();

    const result = [];

    for (let i = 0; i < days; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      const raw = data.records[key] || {};

      // 統一在這裡組 record，確保每一筆都有 date
      const record = {
        date: key,
        codingMinutes: Number(raw.codingMinutes) || 0,
        readingMinutes: Number(raw.readingMinutes) || 0,
        writingMinutes: Number(raw.writingMinutes) || 0,
        // note 不是歷史條必須的，可以有就帶，沒有就空字串
        note: raw.note || '',
      };

      result.push(record);
    }

    res.json({ records: result.reverse() });
  } catch (err) {
    console.error('取得最近進度失敗:', err);
    res.status(500).json({
      error: '伺服器錯誤',
      message: '無法取得最近進度',
    });
  }
});



// 建立或更新單日進度
app.post('/api/progress', (req, res) => {
  try {
    const {
      date,
      codingMinutes,
      readingMinutes,
      writingMinutes,
      note,
    } = req.body;

    if (!date) {
      return res.status(400).json({
        error: '缺少參數',
        message: 'date 為必填欄位',
      });
    }

    const data = readDataFile();

    data.records[date] = {
      date,
      codingMinutes: Number(codingMinutes) || 0,
      readingMinutes: Number(readingMinutes) || 0,
      writingMinutes: Number(writingMinutes) || 0,
      note: note || '',
    };

    writeDataFile(data);

    res.json({ success: true });
  } catch (err) {
    console.error('更新進度失敗:', err);
    res.status(500).json({
      error: '伺服器錯誤',
      message: '無法更新進度',
    });
  }
});

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: '找不到此路徑',
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Practice Rings API 伺服器已啟動，埠號 ${PORT}`);
});
