// Dùng pool chung của ứng dụng
import { pool } from '../db.js';

// Xử lý yêu cầu lấy danh sách người dùng
async function listUsers(req, res) {
    // Chuyển toàn bộ khối try/catch của GET /users vào đây
    try {
        // 2. Lấy tối đa 5 người dùng theo ID tăng dần
        const result = await pool.query(
            'SELECT id, name, email FROM users ORDER BY id LIMIT 5'
        );

        // 3. Trả danh sách người dùng
        return res.status(200).json(result.rows);
    } catch (error) {
        // 4. Ghi lỗi và báo truy vấn thất bại
        console.error(error.message);
        return res.status(500).send('Database query failed');
    }
}

async function getUserById(req, res) {
    // Chuyển toàn bộ phần xử lý của GET /:id vào đây:
    // 1. Đọc và kiểm tra id
    // 2. Truy vấn database
    // 3. Trả response và xử lý lỗi
    const id = Number(req.params.id);

    // Kiểm tra id có phải là số nguyên hay không dùng Number.isInteger() và kiểm tra id có nằm trong khoảng từ 1 đến 2147483647 hay không. Nếu không thì trả về status 400 với message "Invalid user id"
    if (!Number.isInteger(id)) {
        return res.status(400)
            .send('Invalid user id')
    }

    if (id < 1 || id > 2147483647) {
        return res.status(400)
            .send('Invalid user id')
    }

    try {
        // Chạy SELECT bằng pool.query(), lưu vào result
        const result = await pool.query('SELECT id, name, email FROM public.users WHERE id = $1', [id])
        if (result.rows.length === 0) {
            return res.status(404).send('User not found')
        }

        // Trả người dùng tìm được dưới dạng JSON vì result.rows[0] là một object.
        return res.status(200)
            .json(result.rows[0])

    } catch (error) {
        console.error(error.message);
        return res.status(500)
            .send('Database query failed');
    }
}

async function createUser(req, res) {
    const data = req.body;

    // Bạn viết phần validation ở đây

    // Kiểm tra nếu data không phải là object hoặc data là null hoặc data là array thì trả về status 400 với message "Invalid user data"
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return res.status(400).send('Invalid user data');
    }

    // Kiểm tra nếu data.name không phải là string hoặc data.name là rỗng thì trả về status 400 với message "Invalid user data"
    if (typeof data.name !== 'string' || data.name.trim() === '') {
        return res.status(400).send('Invalid user data');
    }

    // Kiểm tra nếu data.email không phải là string hoặc data.email là rỗng thì trả về status 400 với message "Invalid user data"
    if (typeof data.email !== 'string' || data.email.trim() === '') {
        return res.status(400).send('Invalid user data');
    }

    // Sau khi review, ta bổ sung truy vấn INSERT

    const name = data.name.trim();
    const email = data.email.trim();

    try {
        // Gọi await pool.query(câu SQL ở trên, [name, email])
        const result = await pool.query(
            'INSERT INTO public.users (name, email) VALUES ($1, $2) RETURNING id, name, email',
            [name, email]
        );

        // Trả status 201 và JSON result.rows[0]
        return res.status(201).json(result.rows[0]);

    } catch (error) {
        // 1. Nhận diện đúng lỗi email trùng
        if (
            error.code === '23505' &&
            error.constraint === 'users_email_key'
        ) {
            // Bạn viết: trả status 409 và text 'Email already exists'
            // Nhớ return để dừng xử lý
            return res.status(409)
                .send('Email already exists')
        }

        // 2. Các lỗi khác: ghi thông tin và trả 500
        console.error({
            code: error.code,
            constraint: error.constraint,
            message: error.message
        });

        return res.status(500).send('Database query failed');
    }
}

async function updateUser(req, res) {
    // 1. Lấy req.params.id và chuyển thành Number
    const id = Number(req.params.id)

    // 2. Nếu ID không phải số nguyên:
    //    trả 400, nội dung 'Invalid user id'
    if (!Number.isInteger(id)) {
        return res.status(400)
            .send('Invalid user id')
    }

    // 3. Nếu ID nằm ngoài khoảng 1..2147483647:
    //    trả 400, nội dung 'Invalid user id'
    if (id < 1 || id > 2147483647) {
        return res.status(400)
            .send('Invalid user id')
    }

    // Phần kiểm tra body và UPDATE sẽ bổ sung tiếp
    const data = req.body

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return res.status(400)
            .send('Invalid user data')
    }

    if (typeof data.name !== 'string' || data.name.trim() === '') {
        return res.status(400)
            .send('Invalid user data')
    }

    const name = data.name.trim()

    try {
        // 1. Chạy câu UPDATE bằng await pool.query()
        //    Truyền [name, id], lưu kết quả vào result
        const result = await pool.query('UPDATE public.users SET name = $1 WHERE id = $2 RETURNING id, name, email', [name, id])

        // 2. Nếu result.rows.length === 0:
        //    Không tìm thấy người cần sửa
        //    Trả 404, nội dung 'User not found'
        if (result.rows.length === 0) {
            return res.status(404)
                .send('User not found')
        }

        // 3. Nếu có người được sửa:
        //    Trả 200 và JSON result.rows[0]
        return res.status(200)
            .json(result.rows[0])

    } catch (error) {
        console.error(error.message);
        return res.status(500).send('Database query failed');
    }
}

async function deleteUser(req, res) {
    // 1. Lấy ID và chuyển thành Number
    const id = Number(req.params.id)

    // 2. Kiểm tra ID là số nguyên trong khoảng 1..2147483647
    //    Nếu sai: trả 400, 'Invalid user id'
    if (!Number.isInteger(id)) {
        return res.status(400)
            .send('Invalid user id')
    }

    if (id < 1 || id > 2147483647) {
        return res.status(400)
            .send('Invalid user id')
    }

    try {
        // 3. Chạy DELETE ... RETURNING id
        //    Truyền [id], lưu kết quả vào result
        const result = await pool.query('DELETE FROM public.users WHERE id = $1 RETURNING id', [id])

        // 4. Nếu không xóa được dòng nào:
        //    Trả 404, 'User not found'
        if (result.rows.length === 0) {
            return res.status(404)
                .send('User not found')
        }

        // 5. Xóa thành công, kết thúc phản hồi với body rỗng
        return res.status(204)
            .end();

    } catch (error) {
        console.error(error.message);
        return res.status(500).send('Database query failed');
    }
}

// Cho router sử dụng hàm này
export {
    listUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};