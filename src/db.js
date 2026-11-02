//db.js sẽ là nơi chuẩn bị đường kết nối đến database; các file cần truy vấn sẽ lấy pool từ đây.

// 1. Đọc cấu hình kết nối từ file .env
import 'dotenv/config';

// 2. Lấy công cụ tạo pool của pg
import pg from 'pg';
const { Pool } = pg;

// 3. Tạo pool để ứng dụng dùng chung
const pool = new Pool({
    connectionTimeoutMillis: 5000
});

// 4. Cho các file khác sử dụng pool này
export { pool };