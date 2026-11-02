import express from 'express';
import { randomUUID } from 'node:crypto';
import { pool } from './db.js'
// 1. Lấy nhóm route người dùng
import { usersRouter } from './routes/users.js';

const app = express();

// Đọc JSON trước khi chuyển yêu cầu đến các route
app.use(express.json());

// Nối nhóm route người dùng vào ứng dụng
app.use('/users', usersRouter);
const sessions = {};

app.post('/login', (req, res) => {
    const data = req.body;

    // kiểm tra nếu data là null hoặc undefined thì trả về 400 với message "Invalid data"
    if (!data) {
        return res.status(400)
            .send('Invalid data');
    }

    // Tiếp tục xử lý login
    try {
        if (data.name === undefined) {
            return res.status(400).send("Invalid data");
        }

        if (typeof data.name !== 'string') {
            return res.status(400).send("Invalid data");
        }

        if (data.name.trim() === '') {
            return res.status(400).send("Invalid data");
        }
        if (data.age === undefined) {
            return res.status(400).send("Invalid data");
        }

        if (typeof data.age !== 'number') {
            return res.status(400).send("Invalid data");
        }

        if (data.age < 0) {
            return res.status(400).send("Invalid data");
        }

        // Tạo sessionId và lưu vào sessions
        const sessionId = randomUUID();
        sessions[sessionId] = data.name;
        res.cookie('sessionId', sessionId);
        return res.status(200)
            .json({
                message: 'Logged in',
                sessionId
            });

    } catch (error) {
        console.log(error)
        return res.status(500)
            .send("Internal Server Error");
    }

});

app.get('/me', (req, res) => {
    // Bạn chuyển logic /me từ server.js vào đây
    const cookie = req.headers.cookie
    if (!cookie) {
        return res.status(401)
            .send('Unauthorized');
    }
    const sessionId = cookie.split('=')[1]
    const user = sessions[sessionId]
    if (!user) {
        return res.status(401)
            .send('Unauthorized session');
    }

    return res.json({ name: user });
});

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


// Cho file khác sử dụng app và pool đã tạo
export { app, pool };

