// 1. Lấy công cụ viết test, chuẩn bị trước và dọn dẹp sau
import test, { before, after } from 'node:test';

// 2. Lấy công cụ kiểm tra kết quả
import assert from 'node:assert/strict';

// 3. Lấy app và pool đã được chuẩn bị trong app.js
import { app, pool } from '../src/app.js';

// Lấy công cụ đợi một thông báo từ server
import { once } from 'node:events';

// 4. Ghi nhớ server và địa chỉ để gửi yêu cầu

//Giữ server do test mở, để cuối bài đóng đúng server đó.
let server;

//Giữ địa chỉ server đó, để lát nữa thay cho địa chỉ cố định http://localhost:3000.
let baseURL;

before(async () => {
    // 1. Mở server trên máy này, nhờ chọn một cổng đang trống
    server = app.listen(0, '127.0.0.1');

    // 2. Đợi server báo đã sẵn sàng nhận yêu cầu
    await once(server, 'listening');

    // 3. Lấy cổng thực tế và ghi nhớ địa chỉ
    const port = server.address().port;
    baseURL = `http://127.0.0.1:${port}`;
});

test('GET /db-check trả về đúng tên database', async () => {
    const checkResponse = await fetch(`${baseURL}/db-check`, {
        method: 'GET'
    });

    // Kiểm tra response.status bằng assert.equal()
    assert.equal(checkResponse.status, 200);

    // đọc json từ checkResponse và kiểm tra database bằng assert.equal()
    const data = await checkResponse.json();
    assert.equal(data.database, 'first_database');
});

after(async () => {
    try {
        // 1. Chỉ đóng nếu server đã được tạo và đang chạy
        if (server && server.listening) {
            // 2. Chuẩn bị đợi thông báo đóng xong
            const closed = once(server, 'close');

            // 3. Yêu cầu đóng server rồi đợi hoàn tất
            server.close();
            await closed;
        }
    } finally {
        // 4. Đóng pool kể cả khi phần đóng server gặp lỗi
        await pool.end();
    }
});