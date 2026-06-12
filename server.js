const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// ========== ДИАГНОСТИКА ==========
console.log('🚀 1. Файл server.js загружен');
console.log('🔍 2. Переменная DATABASE_URL существует?', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log('🔍 3. Длина строки подключения:', process.env.DATABASE_URL.length);
    console.log('🔍 4. Начинается с postgresql?', process.env.DATABASE_URL.startsWith('postgresql://'));
} else {
    console.error('❌ 3. Переменная DATABASE_URL не найдена!');
}
// ================================

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========== ДИАГНОСТИКА ПОДКЛЮЧЕНИЯ К БД ==========
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ 5. Ошибка подключения к БД:', err.message);
        console.error('❌ 5. Детали ошибки:', err.stack);
    } else {
        console.log('✅ 5. Подключение к БД успешно!');
        release();
    }
});
// =================================================

// ==================== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ====================

async function initDB() {
  console.log('🔧 6. Инициализация таблиц...');
  try {
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
    console.log('✅ 7. Таблицы созданы/проверены');
  } catch (error) {
    console.error('❌ 7. Ошибка инициализации БД:', error.message);
  }
}
initDB();

// ==================== API ЭНДПОИНТЫ ====================

// Получить статус игры
app.get('/api/status', async (req, res) => {
  console.log('📡 8. Получен запрос /api/status');
  try {
    const result = await pool.query(`SELECT value FROM settings WHERE key = 'game_active'`);
    const isActive = result.rows[0]?.value === 'true';
    res.json({ success: true, active: isActive });
  } catch (error) {
    console.error('❌ 8. Ошибка в /api/status:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Старт игры
app.get('/api/start', async (req, res) => {
  console.log('📡 Получен запрос /api/start');
  try {
    await pool.query(`UPDATE settings SET value = 'true' WHERE key = 'game_active'`);
    res.json({ success: true, active: true, message: 'Игра запущена' });
  } catch (error) {
    console.error('Ошибка в /api/start:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Стоп игра
app.get('/api/stop', async (req, res) => {
  console.log('📡 Получен запрос /api/stop');
  try {
    await pool.query(`UPDATE settings SET value = 'false' WHERE key = 'game_active'`);
    res.json({ success: true, active: false, message: 'Игра остановлена' });
  } catch (error) {
    console.error('Ошибка в /api/stop:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Сброс игры
app.get('/api/reset', async (req, res) => {
  console.log('📡 Получен запрос /api/reset');
  try {
    await pool.query(`UPDATE settings SET value = 'false' WHERE key = 'game_active'`);
    await pool.query(`DELETE FROM taps`);
    res.json({ success: true, message: 'Игра сброшена' });
  } catch (error) {
    console.error('Ошибка в /api/reset:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Сохранить тап пользователя
app.post('/api/tap', async (req, res) => {
  console.log('📡 Получен запрос /api/tap');
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
    console.error('Ошибка в /api/tap:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить рейтинг
app.get('/api/leaderboard', async (req, res) => {
  console.log('📡 Получен запрос /api/leaderboard');
  try {
    const result = await pool.query(`SELECT user_id as "userId", user_name as "userName", taps FROM taps ORDER BY taps DESC`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Ошибка в /api/leaderboard:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить общую сумму тапов
app.get('/api/total', async (req, res) => {
  console.log('📡 Получен запрос /api/total');
  try {
    const result = await pool.query(`SELECT SUM(taps) as total FROM taps`);
    const total = parseInt(result.rows[0]?.total) || 0;
    res.json({ success: true, total });
  } catch (error) {
    console.error('Ошибка в /api/total:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`✅ 9. Сервер УСПЕШНО запущен на порту ${port}`);
});
