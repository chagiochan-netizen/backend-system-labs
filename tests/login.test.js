// 1. Lấy công cụ viết test và chuẩn bị, dọn dẹp trước/sau các test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

// 2. Lấy ứng dụng và pool từ app.js
import { app, pool } from '../src/app.js';

// 3. Lấy công cụ đợi server báo đã mở hoặc đóng
import { once } from 'node:events';

// 4. Ghi nhớ server của file test và địa chỉ dùng gửi yêu cầu
let server;
let baseURL;

before(async () => {
    // 1. Mở server bằng app.listen()
    //    Dùng cổng 0 và địa chỉ '127.0.0.1'
    //    Gán kết quả vào biến server
    server = app.listen(0, '127.0.0.1')

    // 2. Dùng await once() đợi server báo 'listening'
    await once(server, 'listening')

    // 3. Lấy cổng thực tế từ server.address().port
    //    Gán baseURL thành http://127.0.0.1:<cổng thực tế>
    const port = server.address().port
    baseURL = `http://127.0.0.1:${port}`
});

test("Login với name rỗng phải trả về 400", async () => {
    // Gửi POST /login bằng fetch()
    const response = await fetch(`${baseURL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: "",
            age: 20
        })
    });

    // Kiểm tra response.status bằng assert.equal()
    assert.equal(response.status, 400);
    const body = await response.text();
    assert.equal(body, "Invalid data");
});

test("Valid data", async () => {
    // Gửi POST /login bằng fetch()
    const response = await fetch(`${baseURL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: "John",
            age: 20
        })
    });

    // Kiểm tra response.status bằng assert.equal()
    assert.equal(response.status, 200);

    //Nhận cookie từ response.headers.get("set-cookie") và kiểm tra nó không null
    const cookie = response.headers.get("set-cookie");
    assert.notEqual(cookie, null);

    //tách cookie từ cookie string và gửi GET /me với cookie đó
    const sessionCookie = cookie.split(";")[0]

    // Gửi GET /me với cookie
    const meResponse = await fetch(`${baseURL}/me`, {
        method: "GET",
        headers: {
            "Cookie": sessionCookie
        }
    });

    // Kiểm tra response.status bằng assert.equal()
    assert.equal(meResponse.status, 200);

    //đọc json từ meResponse và kiểm tra name bằng assert.equal()
    const user = await meResponse.json();
    assert.equal(user.name, "John");
});

test("GET /me không có cookie phải trả về 401", async () => {
    // Gửi GET /me mà không có cookie
    const meResponse = await fetch(`${baseURL}/me`, {
        method: "GET"
    });

    // Kiểm tra response.status bằng assert.equal()
    assert.equal(meResponse.status, 401);

    //kiểm tra body của response bằng assert.equal() với "Unauthorized"
    const body = await meResponse.text();
    assert.equal(body, "Unauthorized");
});

test('GET /me với session không tồn tại phải trả về 401', async () => {
    // Gửi GET /me với cookie sessionId không tồn tại
    const meResponse = await fetch(`${baseURL}/me`, {
        method: "GET",
        headers: {
            Cookie: 'sessionId=does-not-exist'
        }
    });

    // Kiểm tra response.status bằng assert.equal()
    assert.equal(meResponse.status, 401);

    //kiểm tra body của response bằng assert.equal() với "Unauthorized"
    const body = await meResponse.text();
    assert.equal(body, "Unauthorized session");
});


test("John vẫn được nhận diện đúng sau khi David đăng nhập", async () => {
    // Gửi POST /login với name John và age 20
    const responseJohn = await fetch(`${baseURL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: "John",
            age: 20
        })
    });
    assert.equal(responseJohn.status, 200);

    //Giữ cookie của John để gửi GET /me
    const cookieJohn = responseJohn.headers.get("set-cookie");
    assert.notEqual(cookieJohn, null);
    const sessionCookieJohn = cookieJohn.split(";")[0]

    //Gửi POST /login với name David và age 25
    const responseDavid = await fetch(`${baseURL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: "David",
            age: 25
        })
    });
    assert.equal(responseDavid.status, 200);

    //Gọi /me bằng cookie đã giữ từ lần đăng nhập của John
    const meResponseJohn = await fetch(`${baseURL}/me`, {
        method: "GET",
        headers: {
            "Cookie": sessionCookieJohn
        }
    });

    const user = await meResponseJohn.json();
    //Kiểm tra name trả về phải là John
    assert.equal(user.name, "John");
});

test("Cookie cũ ko dùng được sau khi logout", async () => {
    //Gọi POST /login với dữ liệu hợp lệ. Kiểm tra status 200 và giữ lại cookie như test hiện có.
    const postRes = await fetch(`${baseURL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Dylan',
            age: 24
        })
    })

    assert.equal(postRes.status, 200)

    //Giữ lại cookie 
    const cookiePost = postRes.headers.get("set-cookie");
    assert.notEqual(cookiePost, null);
    const sessionCookiePost = cookiePost.split(";")[0]

    //Gọi GET /me với cookie đó. Kiểm tra 200 để chứng minh cookie dùng được trước khi đăng xuất.
    const getRes = await fetch(`${baseURL}/me`, {
        method: 'GET',
        headers: {
            "Cookie": sessionCookiePost
        }
    })

    assert.equal(getRes.status, 200)

    //Gọi POST /logout với cùng cookie. Kiểm tra 204, mã ta chọn cho đăng xuất thành công.
    const postLogout = await fetch(`${baseURL}/logout`, {
        method: 'POST',
        headers: {
            "Cookie": sessionCookiePost
        }
    })

    assert.equal(postLogout.status, 204)

    //Gọi lại GET /me bằng chính cookie đã lưu ở bước 1. Lần này phải nhận 401.
    const getRes1 = await fetch(`${baseURL}/me`, {
        method: 'GET',
        headers: {
            "Cookie": sessionCookiePost
        }
    })

    assert.equal(getRes1.status, 401)
})

test("Logout hoạt động khi request gửi nhiều cookie", async () => {
    //Gọi POST /login với dữ liệu hợp lệ. Kiểm tra status 200 và giữ lại cookie như test hiện có.
    const postRes = await fetch(`${baseURL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Dylan',
            age: 24
        })
    })

    assert.equal(postRes.status, 200)

    //Giữ lại cookie 
    const cookiePost = postRes.headers.get("set-cookie");
    assert.notEqual(cookiePost, null);
    const sessionCookiePost = cookiePost.split(";")[0]
    const cookieWithTheme = `theme=dark; ${sessionCookiePost}`;

    //Gọi GET /me với cookie đó. Kiểm tra 200 để chứng minh cookie dùng được trước khi đăng xuất.
    const getRes = await fetch(`${baseURL}/me`, {
        method: 'GET',
        headers: {
            "Cookie": cookieWithTheme
        }
    })

    assert.equal(getRes.status, 200)

    //Gọi POST /logout với cùng cookie. Kiểm tra 204, mã ta chọn cho đăng xuất thành công.
    const postLogout = await fetch(`${baseURL}/logout`, {
        method: 'POST',
        headers: {
            "Cookie": cookieWithTheme
        }
    })

    assert.equal(postLogout.status, 204)

    //Gọi lại GET /me bằng chính cookie đã lưu ở bước 1. Lần này phải nhận 401.
    const getRes1 = await fetch(`${baseURL}/me`, {
        method: 'GET',
        headers: {
            "Cookie": cookieWithTheme
        }
    })

    assert.equal(getRes1.status, 401)
})

after(async () => {
    try {
        // 1. Nếu server tồn tại và đang mở:
        if (server && server.listening) {
            // 2. Đăng ký đợi sự kiện 'close'
            //    Dùng once(server, 'close'), lưu vào biến closed
            const closed = once(server, 'close')

            // 3. Gọi server.close() để bắt đầu đóng server
            server.close()

            // 4. Dùng await closed để đợi đóng xong
            await closed
        }
    } finally {
        // 5. Dùng await pool.end() để đóng pool của ứng dụng
        await pool.end()
    }
});
