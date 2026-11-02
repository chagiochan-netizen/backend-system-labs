// 1. Lấy công cụ gom các route của Express
import { Router } from 'express';

import {
    listUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/users.js';

// 3. Tạo nhóm route dành cho người dùng
const usersRouter = Router();

// Các route người dùng sẽ được chuyển vào đây
// 1. Nhận yêu cầu GET /users thông qua nhóm route
usersRouter.get('/', listUsers)

usersRouter.get('/:id', getUserById)

usersRouter.post('/', createUser)

usersRouter.patch('/:id', updateUser)

usersRouter.delete('/:id', deleteUser)




// 4. Cho app.js sử dụng nhóm route này
export { usersRouter };