import express from 'express';
import { randomUUID } from 'node:crypto';

const authRouter = express.Router();
const sessions = {};

// Đặt authRouter.post('/login', ...) ở đây.
authRouter.post('/login', (req, res) => {
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

})
// Đặt authRouter.get('/me', ...) ở đây.
authRouter.get('/me', (req, res) => {
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
})

export { authRouter };




