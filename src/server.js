"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app = (0, express_1.default)();
const PORT = 3000;
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.use((req, res, next) => {
    // Mengambil nilai origin dari permintaan HTTP
    const allowedOrigin = req.headers.origin;
    // Mengatur header Access-Control-Allow-Origin berdasarkan nilai origin
    res.header('Access-Control-Allow-Origin', allowedOrigin); // Atau '*'
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Tangani permintaan OPTIONS
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // Respon dengan status HTTP 200 (OK) untuk permintaan OPTIONS
    }
    next(); // Lanjutkan ke middleware berikutnya
});
const accessValidation = (req, res, next) => {
    const validationReq = req;
    const { authorization } = validationReq.headers;
    console.log('here: ', authorization);
    if (!authorization) {
        return res.status(401).json({
            message: 'token diperlukan'
        });
    }
    const token = authorization.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    try {
        const jwtDecode = jsonwebtoken_1.default.verify(token, secret);
        if (typeof jwtDecode !== 'string') {
            validationReq.userData = jwtDecode;
        }
    }
    catch (error) {
        return res.status(401).json({
            message: 'Unauthorized'
        });
    }
    next();
};
// REGISTER
app.use('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = req.body;
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    const result = yield prisma.users.create({
        data: {
            name,
            email,
            password: hashedPassword,
        }
    });
    res.json({
        data: {
            name,
            email
        },
        message: 'user created'
    });
}));
// LOGIN
app.use('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (typeof email !== 'string')
        return res.status(404).send('invalid email');
    const user = yield prisma.users.findUnique({
        where: {
            email: email
        }
    });
    //console.log(user)
    if (!user) {
        return res.status(404).json({
            message: 'User not found'
        });
    }
    if (!user.password) {
        return res.status(404).json({
            message: 'Password not found'
        });
    }
    const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
    if (isPasswordValid) {
        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            address: user.address
        };
        const secret = process.env.JWT_SECRET;
        const expiresIn = 60 * 60 * 1;
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: expiresIn });
        return res.json({
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                address: user.address
            },
            token: token
        });
    }
    else {
        return res.status(404).json({
            message: 'Wrong password'
        });
    }
}));
// CREATE
app.post('/users', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, address } = req.body;
    const result = yield prisma.users.create({
        data: {
            name: name,
            email: email,
            address: address
        }
    });
    res.json({
        data: result,
        message: 'User created'
    });
}));
// READ
app.get('/users', accessValidation, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma.users.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            address: true,
        }
    });
    res.json({
        data: result,
        message: 'User lists'
    });
}));
// Detail User
app.get('/users/:id', accessValidation, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield prisma.users.findMany({
            where: {
                id: parseInt(id)
            },
            select: {
                id: true,
                name: true,
                email: true,
                address: true
            }
        });
        if (!result) {
            return res.status(404).json({
                message: 'Merek tidak ditemukan'
            });
        }
        res.json({
            data: result,
            message: `User Detail ${id}`
        });
    }
    catch (error) {
        res.json({
            message: error
        });
    }
}));
// UPDATE
app.patch('/users/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, email, address } = req.body;
    const result = yield prisma.users.update({
        data: {
            name: name,
            email: email,
            address: address,
        },
        where: {
            id: Number(id)
        }
    });
    res.json({
        data: result,
        message: `User ${id} updated`
    });
}));
// DELETE
app.delete('/users/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield prisma.users.delete({
        where: {
            id: Number(id)
        }
    });
    res.json({
        message: `User ${id} deleted`
    });
}));
app.listen(PORT, () => {
    console.log(`Server in running PORT: ${PORT}`);
});
