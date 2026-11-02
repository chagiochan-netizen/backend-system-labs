// 1. Lấy app đã được chuẩn bị trong app.js
import { app } from './app.js';

// 2. Chọn cổng nhận yêu cầu
const PORT = 3000;

// 3. Mở server
app.listen(PORT, () => {
    console.log(`Express server is running at PORT ${PORT}`);
});