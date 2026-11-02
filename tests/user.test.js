import assert from 'node:assert/strict';
import 'dotenv/config';
import pg from 'pg';
import { text } from 'node:stream/consumers';
import { get } from 'node:http';
import { randomUUID } from 'node:crypto';
// 1. Lấy thêm before và after để mở, đóng server
import test, { before, after } from 'node:test';

// 2. Lấy app và đặt tên pool của ứng dụng là appPool
import { app, pool as appPool } from '../src/app.js';

// 3. Lấy công cụ đợi server mở hoặc đóng
import { once } from 'node:events';

// 4. Ghi nhớ server và địa chỉ gửi yêu cầu
let server;
let baseURL;

before(async () => {
    // 1. Mở server với cổng 0 tại '127.0.0.1', lưu vào server
    server = app.listen(0, '127.0.0.1')

    // 2. Đợi sự kiện 'listening'
    await once(server, 'listening')

    // 3. Lấy cổng thực tế và gán địa chỉ vào baseURL
    const port = server.address().port
    baseURL = `http://127.0.0.1:${port}`
});

//GET
test('GET /users/abc phải trả về 400', async () => {
    // Gửi GET /users/abc bằng fetch()
    const checkResponse = await fetch(`${baseURL}/users/abc`, {
        method: 'GET'
    });
    assert.equal(checkResponse.status, 400);

    // đọc text từ checkResponse và kiểm tra message bằng assert.equal()
    const body = await checkResponse.text();
    assert.equal(body, 'Invalid user id');
});

test('GET /users/999999 không tồn tại phải trả về 404', async () => {
    // Gửi GET /users/999999 bằng fetch()
    const checkResponse = await fetch(`${baseURL}/users/999999`, {
        method: 'GET'
    });
    assert.equal(checkResponse.status, 404);

    // đọc text từ checkResponse và kiểm tra message bằng assert.equal()
    const body = await checkResponse.text();
    assert.equal(body, 'User not found');
});

test('GET /users/201 trả về đúng người dùng An', async () => {
    // Gửi GET /users/201 bằng fetch()
    const checkResponse = await fetch(`${baseURL}/users/201`, {
        method: 'GET'
    });
    assert.equal(checkResponse.status, 200);

    const body = await checkResponse.json();
    assert.equal(body.id, 201);
    assert.equal(body.name, 'An');
    assert.equal(body.email, 'an201@example.com');
});

test('GET /users trả về danh sách người dùng theo ID tăng dần', async () => {
    const checkResponse = await fetch(`${baseURL}/users`, {
        method: 'GET'
    });
    assert.equal(checkResponse.status, 200);

    const body = await checkResponse.json();
    assert.equal(Array.isArray(body), true);
    assert.equal(body.length, 3);
    assert.equal(body[0].id, 201);
    assert.equal(body[1].id, 202);
    assert.equal(body[2].id, 203);

});



//POST
test('POST /users với name chỉ có khoảng trắng phải trả về 400', async () => {
    // 1. Gửi POST /users
    //    headers: { 'Content-Type': 'application/json' }
    //    body: JSON.stringify({
    //        name: '   ',
    //        email: 'test@example.com'
    //    })

    const checkResponse = await fetch(`${baseURL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: '   ',
            email: 'test@example.com'
        })
    });

    // 2. Kiểm tra status bằng 400
    assert.equal(checkResponse.status, 400);

    // 3. Đọc response.text()
    //    Kiểm tra nội dung bằng 'Invalid user data'
    const body = await checkResponse.text();
    assert.equal(body, 'Invalid user data');
});

test('POST /users với email chỉ có khoảng trắng phải trả về 400', async () => {
    const checkResponse = await fetch(`${baseURL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Linh',
            email: '   '
        })
    });

    // 2. Kiểm tra status bằng 400
    assert.equal(checkResponse.status, 400);

    // 3. Đọc response.text()
    //    Kiểm tra nội dung bằng 'Invalid user data'
    const body = await checkResponse.text();
    assert.equal(body, 'Invalid user data');
});

test('POST /users tạo người dùng và GET đọc lại được', async () => {
    const pool = new pg.Pool({ connectionTimeoutMillis: 5000 });
    let createdId;

    try {
        // 1. Gửi POST /users:
        //    name: 'Linh'
        //    email: 'linh.test@example.com'
        const checkResponse = await fetch(`${baseURL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Linh',
                email: 'linh.test@example.com'
            })
        });

        // 2. Đọc JSON, lưu vào createdUser
        //    Gán createdId = createdUser.id trước các assertion
        const createdUser = await checkResponse.json();
        createdId = createdUser.id;

        // 3. Kiểm tra:
        //    status === 201
        //    createdId là số nguyên và > 0
        //    name, email đúng với dữ liệu gửi lên
        assert.equal(checkResponse.status, 201);
        assert.equal(Number.isInteger(createdId), true);
        assert.equal(createdId > 0, true);
        assert.equal(createdUser.name, 'Linh');
        assert.equal(createdUser.email, 'linh.test@example.com');

        // 4. Gửi GET /users/<createdId>
        //    Kiểm tra status 200
        //    Kiểm tra id, name, email của người đọc lại
        const getResponse = await fetch(`${baseURL}/users/${createdId}`, {
            method: 'GET'
        });
        assert.equal(getResponse.status, 200);
        const retrievedUser = await getResponse.json();
        assert.equal(retrievedUser.id, createdId);
        assert.equal(retrievedUser.name, 'Linh');
        assert.equal(retrievedUser.email, 'linh.test@example.com');

    } finally {
        try {
            if (Number.isInteger(createdId) && createdId > 0) {
                await pool.query(
                    'DELETE FROM public.users WHERE id = $1',
                    [createdId]
                );
            }
        } finally {
            await pool.end();
        }
    }
});



//PATCH
test('PATCH /users/abc phải trả về 400', async () => {
    // Gửi PATCH /users/abc
    // Content-Type: application/json
    // Body: { name: 'An Nguyen' }

    const checkResponse = await fetch(`${baseURL}/users/abc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'An Nguyen'
        })
    })

    // Kiểm tra status 400
    assert.equal(checkResponse.status, 400)
    // Kiểm tra text 'Invalid user id'
    const body = await checkResponse.text()
    assert.equal(body, 'Invalid user id')
});

test('PATCH /users/999999 không tồn tại phải trả về 404', async () => {
    // Bạn tự viết
    const checkResponse = await fetch(`${baseURL}/users/999999`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'An Nguyen'
        })
    })

    // Kiểm tra status 404
    assert.equal(checkResponse.status, 404)

    // Kiểm tra text 'User not found'
    const body = await checkResponse.text()
    assert.equal(body, 'User not found')
});

test('PATCH /users/:id cập nhật tên và giữ nguyên email', async () => {
    // 1. Tạo pool cho test và biến lưu ID để dọn dữ liệu
    const pool = new pg.Pool({ connectionTimeoutMillis: 5000 });
    let createdId;

    try {
        // 2. Gửi POST tạo người dùng tạm
        const checkResponse = await fetch(`${baseURL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Linh',
                email: 'linh.patch@example.com'
            })
        });

        // 3. Đọc JSON và lưu ID trước các assertion
        const createdUser = await checkResponse.json();
        createdId = createdUser.id;

        // 4. Kiểm tra người dùng được tạo thành công
        assert.equal(checkResponse.status, 201);
        assert.equal(Number.isInteger(createdId), true);
        assert.equal(createdId > 0, true);
        assert.equal(createdUser.name, 'Linh');
        assert.equal(createdUser.email, 'linh.patch@example.com');

        // 5. Gửi PATCH đổi tên, dùng đúng địa chỉ localhost
        const patchResponse = await fetch(
            `${baseURL}/users/${createdId}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: '  Linh Updated  ' })
            }
        );

        // 6. Kiểm tra status và thông tin sau cập nhật
        assert.equal(patchResponse.status, 200);
        const retrivedUser = await patchResponse.json();
        assert.equal(retrivedUser.id, createdId);
        assert.equal(retrivedUser.name, 'Linh Updated');
        assert.equal(retrivedUser.email, 'linh.patch@example.com');

        // 7. Gửi GET đọc lại người dùng từ API
        const getResponse = await fetch(
            `${baseURL}/users/${createdId}`,
            { method: 'GET' }
        );

        // 8. Kiểm tra dữ liệu đã lưu: tên mới, ID và email giữ nguyên
        assert.equal(getResponse.status, 200);
        const savedUser = await getResponse.json();
        assert.equal(savedUser.id, createdId);
        assert.equal(savedUser.name, 'Linh Updated');
        assert.equal(savedUser.email, 'linh.patch@example.com');

    } finally {
        try {
            // 9. Xóa đúng người dùng tạm do test tạo
            if (Number.isInteger(createdId) && createdId > 0) {
                await pool.query(
                    'DELETE FROM public.users WHERE id = $1',
                    [createdId]
                );
            }
        } finally {
            // 10. Đóng pool của test kể cả khi DELETE gặp lỗi
            await pool.end();
        }
    }
});

test('PATCH với tên chỉ có khoảng trắng trả 400 và giữ nguyên tên cũ', async () => {
    // 1. Tạo pool cho test và biến lưu ID để dọn dữ liệu
    const pool = new pg.Pool({ connectionTimeoutMillis: 5000 });
    let createdId;

    try {
        // 2. Gửi POST tạo người dùng tạm
        const checkResponse = await fetch(`${baseURL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Linh',
                email: 'linh.invalid-patch@example.com'
            })
        });

        // 3. Đọc JSON và lưu ID trước các assertion
        const createdUser = await checkResponse.json();
        createdId = createdUser.id;

        // 4. Kiểm tra người dùng được tạo thành công
        assert.equal(checkResponse.status, 201);
        assert.equal(Number.isInteger(createdId), true);
        assert.equal(createdId > 0, true);
        assert.equal(createdUser.name, 'Linh');
        assert.equal(createdUser.email, 'linh.invalid-patch@example.com');

        // 5. Gửi PATCH đổi tên, dùng đúng địa chỉ localhost
        const patchResponse = await fetch(
            `${baseURL}/users/${createdId}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: ' ' })
            }
        );

        // 6. Kiểm tra status 400 và text invalid user data
        assert.equal(patchResponse.status, 400);
        const body = await patchResponse.text()
        assert.equal(body, 'Invalid user data')

        // 7. Gửi GET đọc lại người dùng từ API
        const getResponse = await fetch(
            `${baseURL}/users/${createdId}`,
            { method: 'GET' }
        );

        // 8. Kiểm tra dữ liệu đã lưu: tên mới, ID và email giữ nguyên
        assert.equal(getResponse.status, 200);
        const savedUser = await getResponse.json();
        assert.equal(savedUser.id, createdId);
        assert.equal(savedUser.name, 'Linh');
        assert.equal(savedUser.email, 'linh.invalid-patch@example.com');

    } finally {
        try {
            // 9. Xóa đúng người dùng tạm do test tạo
            if (Number.isInteger(createdId) && createdId > 0) {
                await pool.query(
                    'DELETE FROM public.users WHERE id = $1',
                    [createdId]
                );
            }
        } finally {
            // 10. Đóng pool của test kể cả khi DELETE gặp lỗi
            await pool.end();
        }
    }
});


//DELETE
test('DELETE /users/abc phải trả về 400', async () => {
    // 1. Gửi DELETE /users/abc, không cần body
    const checkResponse = await fetch(`${baseURL}/users/abc`, {
        method: 'DELETE'
    })

    // 2. Kiểm tra status 400
    assert.equal(checkResponse.status, 400)

    // 3. Đọc text và kiểm tra 'Invalid user id'
    const body = await checkResponse.text()
    assert.equal(body, 'Invalid user id')
});

test('DELETE /users/999999 không tồn tại phải trả về 404', async () => {
    // 1. Gửi DELETE /users/999999, không cần body
    const checkResponse = await fetch(`${baseURL}/users/999999`, {
        method: 'DELETE'
    })

    // 2. Kiểm tra status 404
    assert.equal(checkResponse.status, 404)

    // 3. Đọc text và kiểm tra 'User not found'
    const body = await checkResponse.text()
    assert.equal(body, 'User not found')
});

test('DELETE xóa người dùng và GET đọc lại trả về 404', async () => {
    // 1. Tạo pool và biến createdId để dọn dữ liệu
    const pool = new pg.Pool({ connectionTimeoutMillis: 5000 });
    let createdId;

    // 2. Trong try: POST tạo người dùng tạm
    //    name: 'Linh'
    //    email: 'linh.delete@example.com'
    try {
        const postResponse = await fetch(`${baseURL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Linh',
                email: 'linh.delete@example.com'
            })
        })

        // 3. Đọc JSON, lưu createdId trước các assertion
        //    Kiểm tra POST trả 201 và ID là số nguyên dương
        const createdUser = await postResponse.json()
        createdId = createdUser.id
        assert.equal(postResponse.status, 201)
        assert.equal(Number.isInteger(createdId), true)
        assert.equal(createdId > 0, true)


        // 4. Gửi DELETE /users/<createdId>
        //    Kiểm tra status 204
        //    Đọc bằng await response.text(), kiểm tra bằng ''
        const deleteResponse = await fetch(`${baseURL}/users/${createdId}`, {
            method: 'DELETE'
        })

        assert.equal(deleteResponse.status, 204)
        const bodyDelete = await deleteResponse.text()
        assert.equal(bodyDelete, '')

        // 5. Gửi GET /users/<createdId>
        //    Kiểm tra status 404
        //    Kiểm tra text 'User not found'
        const getResponse = await fetch(`${baseURL}/users/${createdId}`, {
            method: 'GET'
        })

        assert.equal(getResponse.status, 404)

        //.text() dùng để đọc toàn bộ body của response dưới dạng chuỗi văn bản.
        const getBody = await getResponse.text()
        assert.equal(getBody, 'User not found')

        // 6. Trong finally: DELETE bằng SQL theo createdId nếu hợp lệ
        //    Sau đó đóng pool bằng finally bên trong như bài trước
    } finally {
        try {
            if (Number.isInteger(createdId) && createdId > 0) {
                await pool.query(
                    'DELETE FROM public.users WHERE id = $1',
                    [createdId]
                );
            }
        } finally {
            // 7. Đóng pool của test kể cả khi DELETE gặp lỗi
            await pool.end();
        }
    }
});


//409 — Email already exists
test('POST /users với email đã tồn tại phải trả về 409', async () => {
    // 1. Tạo pool và biến createdId để dọn dữ liệu
    const pool = new pg.Pool({ connectionTimeoutMillis: 5000 })
    let createdId

    try {
        // 2. Trong try: POST tạo người dùng đầu tiên
        //    name: 'Linh'
        //    email: 'linh.duplicate@example.com'
        const postResponse1 = await fetch(`${baseURL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Linh',
                email: 'linh.duplicate@example.com'
            })
        })

        // 3. Đọc JSON, lưu createdId trước các assertion
        //    Kiểm tra status 201 và ID là số nguyên dương
        const createdUser = await postResponse1.json()
        createdId = createdUser.id
        assert.equal(postResponse1.status, 201)
        assert.equal(Number.isInteger(createdId), true)
        assert.equal(createdId > 0, true)


        // 4. POST tạo người thứ hai
        //    name: 'An'
        //    email: 'linh.duplicate@example.com'
        //    Hai người khác tên nhưng dùng cùng email
        const postResponse2 = await fetch(`${baseURL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'An',
                email: 'linh.duplicate@example.com'
            })
        })

        // 5. Kiểm tra lần POST thứ hai:
        //    status 409
        //    text 'Email already exists'
        assert.equal(postResponse2.status, 409)
        const postBody2 = await postResponse2.text()
        assert.equal(postBody2, 'Email already exists')

        // 6. Trong finally: xóa người đầu tiên theo createdId
        //    Sau đó đóng pool như các bài trước
    } finally {
        try {
            if (Number.isInteger(createdId) && createdId > 0) {
                await pool.query(
                    'DELETE FROM public.users WHERE id = $1',
                    [createdId]
                )
            }
        } finally {
            //Đóng pool của test kể cả khi DELETE gặp lỗi
            await pool.end()
        }
    }
});

test('Hai POST /users cùng email chỉ tạo một người dùng', async () => {
    // 1. Tạo pool để kiểm tra và dọn dữ liệu
    const pool = new pg.Pool({ connectionTimeoutMillis: 5000 })

    // Tạo mail động tạo mới sau mỗi test
    const email = `concurrent-${randomUUID()}@example.com`;

    //Tạo mảng chứa 2 người dùng 
    const users = [
        { name: 'Linh', email: email },
        { name: 'An', email: email }
    ];

    try {
        // 2. Bắt đầu gửi yêu cầu của Linh, chưa đợi phản hồi
        const request1 = fetch(`${baseURL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users[0])
        })

        // 3. Bắt đầu gửi yêu cầu của An, chưa đợi phản hồi
        const request2 = fetch(`${baseURL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users[1])
        })

        // 4. Đợi cả 2 có kết quả 
        const result = await Promise.allSettled([request1, request2])

        // 5. Kiểm tra cả hai lần gọi đều nhận được phản hồi
        assert.equal(result[0].status, 'fulfilled');
        assert.equal(result[1].status, 'fulfilled');

        // 6. Lấy phản hồi và mã HTTP của từng yêu cầu
        const response1 = result[0].value;
        const response2 = result[1].value;

        const status1 = response1.status;
        const status2 = response2.status;

        // 7. Bạn tự viết assertion:
        // Một mã là 201, mã còn lại là 409
        assert.equal(
            (status1 === 201 && status2 === 409) ||
            (status2 === 201 && status1 === 409),
            true
        )

        // 8. Tìm người dùng mang email vừa được hai yêu cầu sử dụng
        // Dùng await pool.query(), truyền [users[0].email]
        // Lưu kết quả vào savedResult
        const savedResult = await pool.query('SELECT id, name, email FROM public.users WHERE email = $1', [users[0].email])

        // Kiểm tra danh sách tìm được có đúng 1 người
        // Dùng assert.equal() để so sánh savedResult.rows.length với 1
        assert.equal(savedResult.rows.length, 1)


    } finally {
        try {
            // 10. Xóa dữ liệu được tạo bằng email riêng của lần test này
            await pool.query(
                'DELETE FROM public.users WHERE email = $1',
                [email]
            )
        } finally {
            //Đóng pool của test kể cả khi DELETE gặp lỗi
            await pool.end()
        }
    }
});

after(async () => {
    try {
        if (server && server.listening) {
            const closed = once(server, 'close')
            server.close()
            await closed
        }
    } finally {
        await appPool.end()
    }
})