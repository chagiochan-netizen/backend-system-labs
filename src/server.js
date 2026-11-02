import http from 'http'
import { randomUUID } from 'node:crypto';

const PORT = 3000

// const server = http.createServer((req, res) => {
//     console.log('METHOD:', req.method)
//     console.log('COOKIE FROM CLIENT:', req.headers.cookie)

//     if (req.method === 'GET' && req.url === '/hello') {
//         res.setHeader('Set-Cookie', 'user=Duong')
//         res.statusCode = 200
//         res.end('Hello World')
//         return
//     }

//     res.statusCode = 404
//     res.end('Not Found')
// })


// const server = http.createServer((req, res) => {
//     if (req.method === 'POST' && req.url === '/users') {
//         let body = ''

//         req.on('data', (chunk) => {
//             body += chunk
//         })

//         req.on('end', () => {
//             try {
//                 console.log('RAW BODY:', body)
//                 const data = JSON.parse(body)
//                 console.log('DATA:', data)
//                 if (data.name === undefined) {
//                     res.statusCode = 400
//                     res.end('Invalid data')
//                     return
//                 }

//                 if (typeof data.name !== 'string') {
//                     res.statusCode = 400
//                     res.end('Invalid data')
//                     return
//                 }

//                 if (data.name.trim() === '') {
//                     res.statusCode = 400
//                     res.end('Invalid data')
//                     return
//                 }

//                 if (data.age === undefined) {
//                     res.statusCode = 400
//                     res.end('Invalid data')
//                     return
//                 }

//                 if (typeof data.age !== 'number') {
//                     res.statusCode = 400
//                     res.end('Invalid data')
//                     return
//                 }


//                 if (data.age < 0) {
//                     res.statusCode = 400
//                     res.end('Invalid data')
//                     return
//                 }

//                 res.setHeader('Content-Type', 'application/json')
//                 res.setHeader('Set-Cookie', 'user=Duong')
//                 console.log(req.headers.cookie)
//                 res.statusCode = 200
//                 res.end(JSON.stringify(data))
//             } catch (error) {
//                 console.log(error)
//                 res.statusCode = 400

//                 res.end('Invalid JSON')
//             }
//         })

//         return
//     }

//     res.statusCode = 404
//     res.end('Not Found')
// })
const sessions = {}

const server = http.createServer((req, res) => {

    if (req.method === 'POST' && req.url === '/login') {
        let body = ''
        req.on('data', (chunk) => {
            body += chunk.toString()
        })

        req.on('end', () => {
            try {
                const data = JSON.parse(body)
                if (data.name === undefined) {
                    res.statusCode = 400
                    res.end('Invalid data')
                    return
                }
                if (typeof data.name !== 'string') {
                    res.statusCode = 400
                    res.end('Invalid data')
                    return
                }

                if (data.name.trim() === '') {
                    res.statusCode = 400
                    res.end('Invalid data')
                    return
                }

                if (data.age === undefined) {
                    res.statusCode = 400
                    res.end('Invalid data')
                    return
                }

                if (typeof data.age !== 'number') {
                    res.statusCode = 400
                    res.end('Invalid data')
                    return
                }


                if (data.age < 0) {
                    res.statusCode = 400
                    res.end('Invalid data')
                    return
                }
                const sessionId = randomUUID();
                sessions[sessionId] = data.name
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Set-Cookie', `sessionId=${sessionId}`)
                res.statusCode = 200
                res.end(JSON.stringify({ message: 'Logged in', sessionId }))
            } catch (err) {
                console.log(err)
                res.statusCode = 400
                res.end('Invalid JSON')
            }
        })
        return

    } else if (req.method === 'GET' && req.url === '/me') {
        const cookie = req.headers.cookie
        if (!cookie) {
            res.statusCode = 401
            res.end('Unauthorized')
            return
        }
        const sessionId = cookie.split('=')[1]
        const user = sessions[sessionId]
        if (!user) {
            res.statusCode = 401
            res.end('Unauthorized session')
            return
        }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ name: user }))
        return
    }

    res.statusCode = 404
    res.end('Not Found')

})

server.listen(PORT, () => {
    console.log('Server is running at PORT 3000')
})