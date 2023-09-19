import express, { NextFunction, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import cors from 'cors'

const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;
const prisma = new PrismaClient();


app.use(bodyParser.json());
app.use(cors())
app.use(express.json())


app.use((req, res, next, ) => {
    
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

interface UserData {
    id: string;
    name: string;
    address: string;
}

interface ValidationRequest extends Request {
    userData: UserData
}

const accessValidation = (req: Request, res: Response, next: NextFunction) => {
    const validationReq = req as ValidationRequest
    const { authorization } = validationReq.headers;

    console.log('here: ', authorization)

    if(!authorization){
        return res.status(401).json({
            message: 'token diperlukan'
        })
    }

    const token = authorization.split(' ')[1];
    const secret = process.env.JWT_SECRET!;

    try{
        const jwtDecode = jwt.verify(token, secret)
        
        if(typeof jwtDecode !== 'string'){
            validationReq.userData = jwtDecode as UserData
        }
    } catch (error) {
        return res.status(401).json({
            message: 'Unauthorized'
        })
    }
    next()
}

// REGISTER
app.use('/register', async (req, res) => {
    const {name, email, password} = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await prisma.users.create({
        data: {
            name,
            email,
            password: hashedPassword,
        }
    })

    res.json({
        data: {
            name,
            email
        },
        message: 'user created'
    })
})

// LOGIN
app.use('/login', async (req, res) => {
    const { email, password } = req.body

    if (typeof email !== 'string' )return res.status(404).send('invalid email')

    const user = await prisma.users.findUnique({
        where: {
            email: email
        }
    })

    //console.log(user)

    if(!user){
        return res.status(404).json({
            message: 'User not found'
        })
    }

    if(!user.password){
        return res.status(404).json({
            message: 'Password not found'
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if(isPasswordValid){
        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            address: user.address
        }
        
        const secret = process.env.JWT_SECRET!;

        const expiresIn = 60 * 60 * 1;

        const token = jwt.sign(payload, secret, {expiresIn: expiresIn})
        
        return res.json({
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                address: user.address
            },
            token: token
        })
    }else{
       return res.status(404).json({
        message: 'Wrong password'
       }) 
    }
})

// CREATE
app.post('/users', async (req, res, next) => {
    const { name, email, address } = req.body;

    const result = await prisma.users.create({
        data: {
            name: name,
            email: email,
            address: address
        }
    })
    res.json({
        data: result,
        message: 'User created'
    })
})

// READ
app.get('/users', accessValidation, async (req, res) => {
    const result = await prisma.users.findMany({
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
    })
})

// Detail User
app.get('/users/:id', accessValidation, async(req, res) => {
    const {id} = req.params

    try{

        const result = await prisma.users.findMany({
            where: {
                id: parseInt(id)
            },
            select:{
                id: true,
                name: true,
                email: true,
                address: true
            }
        })

        if(!result){
            return res.status(404).json({
                message: 'user tidak ditemukan'
            })
        }

        res.json({
            data: result,
            message: `User Detail ${id}`
        })

    } catch (error){
        res.json({
            message: error
        })
    }
})

// UPDATE
app.patch('/users/:id', async (req, res) => {
    const {id} = req.params;
    const { name, email, address } = req.body

    const result = await prisma.users.update({
        data: {
            name: name,
            email: email,
            address: address,
        },
        where: {
            id: Number(id)
        }
    })
    
    res.json({
        data: result,
        message: `User ${id} updated`
    })
})

// DELETE
app.delete('/users/:id', async (req, res) => {
    const {id} = req.params;

    const result = await prisma.users.delete({
        where: {
            id: Number(id)
        }
    })

    res.json({
        message: `User ${id} deleted`
    })
})

// CRUD KATEGORI
// CREATE KATEGORI
app.post('/kategori', accessValidation, async (req, res) => {
    const { kategori } = req.body;

    const result = await prisma.kategori_keyword.create({
        data: {
            kategori: kategori
        }
    })

    res.json({
        data: result,
        message: 'kategori has created'
    })
})

// READ KATEGORI
app.get('/kategori', accessValidation, async (req, res) => {
    const result = await prisma.kategori_keyword.findMany({
        select: {
            kategori: true,
        }
    })

    res.json({
        data: result,
        message: 'List Kategori'
    })
})

// DETAIL KATEGORI
app.get('kategori/:id', accessValidation, async (req, res) => {
    const {id} = req.params

    try{
        const result = await prisma.kategori_keyword.findMany({
            where: {
                id: parseInt(id)
            },
            select:{
                id: true,
                kategori: true
            }
        })

        if(!result){
            return res.status(404).json({
                message: 'kategori tidak ditemukan'
            })
        }

        res.json({
            data: result,
            message: `Kategori Detail ${id}`
        })
    } catch (error){
        res.json({
            message: error
        })
    }
})

// UPDATE KATEGORI
app.patch('/kategori/:id', accessValidation, async (req, res) => {
    const {id} = req.params;
    const {kategori} = req.body;

    const result = await prisma.kategori_keyword.update({
        data: {
            kategori: kategori,
        },
        where: {
            id: parseInt(id)
        }
    })

    res.json({
        data: result,
        message: `Update Kategori ${id}`
    })
})

// DELETE KATEGORI
app.delete('/kategori/:id', accessValidation, async (req, res) => {
    const {id} = req.params;

    const result = await prisma.kategori_keyword.delete({
        where: {
            id: parseInt(id)
        }
    })

    res.json({
        message: `Kategori ${id} Deleted`
    })
})

// KEYWORD
// ADD KEYWORD
app.post('/keyword', async (req, res) => {
    const { intent, deskripsi, keyword } = req.body;

    try{

        const result = await prisma.keyword.create({
            data: {
                intent,
                deskripsi,
                keyword: keyword,
            }
        })

        console.log('Data berhasil disimpan:', result);
        res.status(200).json({ message: 'Data berhasil disimpan.' });

    } catch (error){
        
        console.error('Terjadi kesalahan saat menyimpan data:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan data.', error: error });

    }
})

// UPDATE KEYWORD

app.listen(PORT, () => {
    console.log(`Server in running PORT: ${PORT}`)
})