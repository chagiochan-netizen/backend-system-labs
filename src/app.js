import express from 'express';
import { randomUUID } from 'node:crypto';
import { pool } from './db.js'
// 1. Lấy nhóm route người dùng
import { usersRouter } from './routes/users.js';
import { authRouter } from './routes/auth.js';

const app = express();

// Đọc JSON trước khi chuyển yêu cầu đến các route
app.use(express.json());

// Nối nhóm route người dùng vào ứng dụng
app.use('/users', usersRouter);
app.use('/', authRouter)

app.get('/db-check', async (req, res) => {
    try {
        const result = await pool.query('SELECT current_database() AS database_name');
        const databaseName = result.rows[0].database_name;
        return res.status(200)
            .json({ database: databaseName });
    } catch (error) {
        console.error(error.message);
        return res.status(500)
            .send('Database query failed');
    }
})

export { app, pool };

