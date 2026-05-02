const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==================== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ====================

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS taps (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      taps INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  
  const res = await pool.query(`SELECT * FROM settings WHERE key = 'game_active'`);
  if (res.rows.length === 0) {
    await pool.query(`INSERT INTO settings (key, value) VALUES ('game_active', 'false')`);
  }
}
initDB();

// ==================== API ЭНДПОИНТЫ ====================

// Получить статус игры
app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query(`SELECT value FROM settings WHERE key = 'game_active'`);
    const isActive = result.rows[0]?.value === 'true';
    res.json({ success: true, active: isActive });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Старт игры
app.get('/api/start', async (req, res) => {
  try {
    await pool.query(`UPDATE settings SET value = 'true' WHERE key = 'game_active'`);
    res.json({ success: true, active: true, message: 'Игра запущена' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Стоп игра (блокирует тапы, но не очищает данные)
app.get('/api/stop', async (req, res) => {
  try {
    await pool.query(`UPDATE settings SET value = 'false' WHERE key = 'game_active'`);
    res.json({ success: true, active: false, message: 'Игра остановлена' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Сброс игры (очищает все данные и останавливает)
app.get('/api/reset', async (req, res) => {
  try {
    await pool.query(`UPDATE settings SET value = 'false' WHERE key = 'game_active'`);
    await pool.query(`DELETE FROM taps`);
    res.json({ success: true, message: 'Игра сброшена' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Сохранить тап пользователя (POST)
app.post('/api/tap', async (req, res) => {
  try {
    const { userId, userName, taps } = req.body;
    
    const existing = await pool.query(`SELECT * FROM taps WHERE user_id = $1`, [userId]);
    
    if (existing.rows.length > 0) {
      await pool.query(`UPDATE taps SET taps = $1, user_name = $2 WHERE user_id = $3`, [taps, userName, userId]);
    } else {
      await pool.query(`INSERT INTO taps (user_id, user_name, taps) VALUES ($1, $2, $3)`, [userId, userName, taps]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить рейтинг (всех участников, отсортированных по тапам)
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`SELECT user_id as "userId", user_name as "userName", taps FROM taps ORDER BY taps DESC`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить общую сумму тапов (для лампочки и прогресс-бара)
app.get('/api/total', async (req, res) => {
  try {
    const result = await pool.query(`SELECT SUM(taps) as total FROM taps`);
    const total = parseInt(result.rows[0]?.total) || 0;
    res.json({ success: true, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
