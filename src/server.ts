import express, { NextFunction, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import bodyParser from 'body-parser';

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
    res.header('Content-Type', 'application/json');
    
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
app.get('/users', async (req, res) => {
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
app.get('/users/:id', async(req, res) => {
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

// CRUD MENU
// CREATE MENU
app.post('/addMenu', async (req, res) => {
    const { nama_menu, deskripsi_menu, id_subMenu, id_kategori } = req.body;
    //const id_subMenuArray = req.body.id_subMenu.map(Number);
    try{

        const result = await prisma.menu.create({
            data: {
                nama_menu,
                deskripsi_menu,
                id_kategori,
            }
        })

        for (const subMenuId of id_subMenu) {
            if(subMenuId !== null){
                await prisma.menuToSubMenu.create({
                    data: {
                    menuId: result.id,
                    subMenuId,
                    },
                });
            }
            
        }
        
        console.log('result', result)
        res.json({
            data: result,
            message: 'Menu has created'
        })
        
    }catch (error) {
        console.error("Terjadi kesalahan:", error);
        res.status(500).json({ error: "Terjadi kesalahan dalam pengolahan data" });
    }
    
})

// CREATE MENU 2
app.post('/addMenu2', async (req, res) => {
    const { nama_menu, deskripsi_menu, id_subMenu, id_kategori } = req.body;
    //const id_subMenuArray = req.body.id_subMenu.map(Number);
    try{

        const result = await prisma.menu.create({
            data: {
                nama_menu,
                deskripsi_menu,
                id_kategori,
            }
        })

        for (const subMenuId of id_subMenu) {
            await prisma.menuToSubMenu.create({
                data: {
                menuId: result.id,
                subMenuId,
                },
            });
            
        }
        
        console.log('result', result)
        res.json({
            data: result,
            message: 'Menu has created'
        })
        
    } catch (error) {
        console.error("Terjadi kesalahan:", error);
        res.status(500).json({ error: "Terjadi kesalahan dalam pengolahan data" });
    }
})

// READ MENU
app.get('/menu', async (req, res) => {
    
    try {

        const result = await prisma.menu.findMany({
            include: {
                subMenus: {
                    include: {
                        subMenu: true
                    }
                },
                kategori: true
            }
        })

        if (result.length === 0){

            return res.status(200).json({
                message: 'Belum ada data menu'
            })
        }
    
        res.json({
            data: result,
            message: 'List Menu'
        })

    } catch (error) {

        console.log(error)
        res.status(500).json({
            message: 'Terjadi kesalahan saat mengambil data menu'
        })
    
    }
})

// DETAIL MENU
app.get('/detailMenu/:id', async (req, res) => {
    const menuId = parseInt(req.params.id)

    try{
        // Dapatkan menu berdasarkan ID
        const menu = await prisma.menu.findUnique({
            where: {
                id: menuId
            },
            include:{
                subMenus: {
                    include: {
                        subMenu: true
                    }
                },
                kategori:true
                // id_subMenu: true
            }
        })

        if(!menu){
            return res.status(404).json({
                message: 'Menu tidak ditemukan'
            })
        }

        res.json({
            data: menu,
            message: 'Menu Details'
        })
    } catch (error){
        res.json({
            message: error
        })
    }
})

// UPDATE MENU
app.patch('/updateMenu/:id', async (req, res) => {
    const menuId = parseInt(req.params.id);
    const {nama_menu, deskripsi_menu, id_kategori, id_subMenu} = req.body;

    try {
        
        const updatedMenu = await prisma.menu.update({
            where: {
                id: menuId
            },
            data: {
                nama_menu,
                deskripsi_menu,
                id_kategori:1,
                // id_subMenu: id_subMenu
            },
            
        })
    
        // Hapus entri yang terkait dalam tabel menuToSubMenu
        await prisma.menuToSubMenu.deleteMany({
            where: {
                menuId: menuId
            }
        })
    
    
        for(const subMenuId of id_subMenu){
            await prisma.menuToSubMenu.create({
                data: {
                    menuId: updatedMenu.id,
                    subMenuId
                }
            })
        }
    
        res.json({
            data: updatedMenu,
            message: 'Menu has been updated'
        })
    } catch (error){
        console.error("Terjadi kesalahan:", error);
        res.status(500).json({ error: "Terjadi kesalahan dalam pembaruan menu" });
    }
})

// Endpoint untuk mengambil data SubMenu berdasarkan ID Menu
app.get('/menuToSubMenu/:menuId/subMenu', async (req, res) => {
    const { menuId } = req.params;
    try {
      const subMenu = await prisma.menuToSubMenu.findMany({
        where: {
          menuId: parseInt(menuId), // Ubah ke tipe data yang sesuai
        },
        include: {
          subMenu: true,
        },
      });
      res.json(subMenu);
    } catch (error) {
      console.error('Error fetching SubMenu:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// CHECK DUPLICATE MENU
app.get('/checkMenu', async (req, res) => {
    const nama_menu = req.query.nama_menu as string | undefined;

    try {
        if (typeof nama_menu === 'string') {
            const existingMenu = await prisma.menu.findUnique({
                where: {
                    nama_menu: nama_menu
                }
            });

            if (existingMenu) {
                res.json({ exists: true });
            } else {
                res.json({ exists: false });
            }
        } else {
            // Handle kasus ketika kategori bukan string (misalnya jika kategori adalah array, objek, atau undefined)
            res.status(400).json({ error: 'Menu harus berupa string' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan dalam memeriksa Menu.' });
    }
})

// DELETE MENU
app.delete('/deleteMenu/:id', async (req, res) => {
    const menuId = parseInt(req.params.id)

    try{

        await prisma.menuToSubMenu.deleteMany({
            where: {
                menuId: menuId
            }
        })

        const deleteMenu = await prisma.menu.delete({
            where: {
                id: menuId
            }
        })
    
        res.json({
            data: deleteMenu,
            message: `Menu has been deleted`
        })
    } catch (error){
        console.error("Terjadi kesalahan", error)
        res.status(500).json({ error: "Terjadi kesalahan dalam penghapusan menu" });
    }

    
})

// CREATE SUB MENU 
app.post('/addSubMenu', async (req, res) => {
    const { subMenu, deskripsi_subMenu } = req.body;

    const result = await prisma.subMenu.create({
        data: {
            subMenu: subMenu,
            deskripsi_subMenu: deskripsi_subMenu
        }
    })

    if(!result){
        return res.status(404).json({
            messsage: "Created Sub Menu Gagal"
        })
    }

    res.json({
        data: result,
        message: 'Sub Menu has created'
    })
})

app.post('/addSubMenu2', async (req, res) => {
    const {subMenuData} = req.body;

    if(!Array.isArray(subMenuData)){
        // Kasus ketika subMenus bukan array
        console.error("subMenus bukan array");
        return res.status(400).json({
            message: 'subMenus harus berupa array',
        });

    }

    try{

        const results = []

        for(const subMenus of subMenuData){
            const { subMenu, deskripsi_subMenu } = subMenus
            
            const isEmpty = await prisma.subMenu.count() === 0;

            // Ambil jumlah total data saat ini di tabel subMenu
            const totalCount = await prisma.subMenu.count();

            let idToSet = isEmpty ? 1 : totalCount + 1;
            // let idToSet = 1;

            
            const result = await prisma.subMenu.create({
                data: {
                    id: idToSet++,
                    subMenu: subMenu,
                    deskripsi_subMenu: deskripsi_subMenu || 'Deskripsi Default',
                },
            })
            
            results.push(result)
            
            
        }

        if(results.length === 0){
            return res.status(404).json({
                message: 'data submenu masih kosong'
            })
        }

        res.json({
            data: results,
            message: 'Sub Menus have been created',
        })
        
    } catch (error){
        console.error(error);
        res.status(500).json({
            message: 'Terjadi kesalahan dalam membuat subMenu'
        })
    }


})

// READ SUB MENU
app.get('/subMenu', async (req, res) => {
    
    try {

        const result = await prisma.subMenu.findMany({
            select: {
                id: true,
                subMenu: true,
                deskripsi_subMenu: true
            }
        })
    
        if(result.length === 0){
            
            return res.status(200).json({
                message: 'Data sub menu kosong'
            })
        }

        res.json({
            data: result,
            message: 'List Sub Menu'
        })

        

    } catch (error){

        console.error(error)
        res.status(500).json({
            message: 'terjadi Kesalahan dalam pengambilan sub menu'
        })
    }
})

// DETAIL SUB MENU
app.get('/subMenu/:id', async (req, res) => {
    const {id} = req.params

    try{
        const result = await prisma.subMenu.findUnique({
            where: {
                id: parseInt(id)
            },
            select:{
                id: true,
                subMenu: true,
                deskripsi_subMenu: true
            }
        })

        if(!result){
            return res.status(404).json({
                message: 'Sub Menu tidak ditemukan'
            })
        }

        res.json({
            data: result,
            message: `SUb Menu Detail ${id}`
        })
    } catch (error){
        res.json({
            message: error
        })
    }
})

// UPDATE SUB MENU
app.patch('/subMenu/:id', async (req, res) => {
    const {id} = req.params;
    const {subMenu, deskripsi_subMenu} = req.body;

    const result = await prisma.subMenu.update({
        data: {
            subMenu: subMenu,
            deskripsi_subMenu: deskripsi_subMenu
        },
        where: {
            id: parseInt(id)
        }
    })

    if(!result){
        res.status(404).json({
            message: `Sub Menu tidak ditemukan dengan id : ${id}`
        })
    }

    res.json({
        data: result,
        message: `Update Sub Menu ${id}`
    })
})

// DELETE SUB MENU
app.delete('/subMenu/:id', async (req, res) => {
    const {id} = req.params;

    const result = await prisma.subMenu.delete({
        where: {
            id: parseInt(id)
        }
    })

    res.json({
        message: `Sub Menu ${id} Deleted`
    })
})

// CHECK DUPLIKAT SUB MENU
app.get('/checkSubMenu', async (req, res) => {
    const subMenu = req.query.subMenu as string | undefined;

    try {
        if (typeof subMenu === 'string') {
            const existingSubMenu = await prisma.subMenu.findUnique({
                where: {
                    subMenu: subMenu
                }
            });

            if (existingSubMenu) {
                res.json({ 
                    exists: true,
                    data: "Sub Menu sudah ada say"
                 });
            } else {
                res.json({ exists: false });
            }
        } else {
            // Handle kasus ketika kategori bukan string (misalnya jika kategori adalah array, objek, atau undefined)
            res.status(400).json({ error: 'Sub Menu harus berupa string' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan dalam memeriksa Sub Menu.' });
    }
})

// Multi CHECK DUPLIKAT SUB MENU
app.post('/multiCheckSubMenu', async (req, res) => {
    try {
      const { subMenus } = req.body;
  
      if (!Array.isArray(subMenus)) {
        return res.status(400).json({ error: 'subMenus harus berupa array' });
      }
  
      const results = await Promise.all(subMenus.map(async (subMenu) => {
        const existingSubMenu = await prisma.subMenu.findUnique({
          where: {
            subMenu,
          },
        });
        return {
          subMenu,
          exists: !!existingSubMenu,
        };
      }));
  
      res.json({ results });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Terjadi kesalahan dalam memeriksa subMenu.' });
    }
});

// KEYWORD
// ADD KEYWORD
app.post('/keyword', async (req, res) => {
    const { keywordData } = req.body;

    try{

        const results = []

        for(const DataKeywords of keywordData){
            const { keyword } = DataKeywords

            const isEmpty = await prisma.keyword.count() === 0

            // Ambil jumlah total data saat ini di tabel subMenu
            const totalCount = await prisma.keyword.count();

            let idToSet = isEmpty ? 1 : totalCount + 1;            

            const result = await prisma.keyword.create({
                data: {
                    id: idToSet++,
                    keyword: keyword
                }
            })

            results.push(result)
            
        }

        if(results.length === 0){
            res.status(202).json({
                message: 'Data keyword masih kosong'
            })
        }

        res.json({
            data: results,
            message: 'List Keyword'
        })

    } catch (error){
        
        console.error('Terjadi kesalahan saat menyimpan data:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan data.', error: error });

    }
})

// READ KEYWORD 
app.get('/keyword', async (req, res) => {
    const result = await prisma.keyword.findMany({
        select: {
            id: true,
            keyword: true
        }
    })

    res.json({
        data: result,
        message: 'list data intent'
    })
})

// DELETE KEYWORD
app.delete('/deleteKeyword/:id', async (req, res) => {
    const {id} = req.params;

    const result = await prisma.keyword.delete({
        where: {
            id: parseInt(id)
        }
    })

    res.json({
        message: `deleted sukses ${id}`
    })
})

// CREATE INTENT
app.post('/intent', async (req, res) => {
    const { intent, deskripsi, id_keyword } = req.body

    try {

        const result = await prisma.intent.create({
            data: {
                intent,
                deskripsi
            }
        })

        for (const keywordId of id_keyword){
            await prisma.intentToKeyword.create({
                data: {
                    intentId: result.id,
                    keywordId,
                },
            })
        }

        res.json({
            data: result,
            message: 'Intent has created'
        })

    } catch (err){
        res.status(500).json({
            message: 'Terjadi kesalahan dalam server'
        })
    }
})

// READ INTENT
app.get('/intent', async (req, res) => {
    
    try {

        const result = await prisma.intent.findMany({
            include: {
                keywords: {
                    include: {
                        keyword: true
                    }
                }
            }
        })
    
        if(!result){
            return res.status(404).json({
                message: 'Terjadi Kesalahan dalam pengambilan data Intent'
            })
        } else if (result.length === 0){
            return res.status(202).json({
                data: result,
                message: 'Data Intent masih Kosong'
            })
        }
    
        res.json({
            data: result,
            message: 'List Data Intent'
        })

    } catch (err){
        
        res.status(500).json({
            message: 'Terjadi kesalahan dalam server'
        })

    }
})

// CRUD KATEGORI
// CREATE KATEGORI
app.post('/addKategori', async (req, res) => {
    const { kategori } = req.body;

    const result = await prisma.kategori.create({
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
app.get('/kategori', async (req, res) => {
    const result = await prisma.kategori.findMany({
        select: {
            id: true,
            kategori: true
        }
    })

    res.json({
        data: result,
        message: 'List Kategori'
    })
})

// DETAIL KATEGORI
app.get('/kategori/:id', async (req, res) => {
    const {id} = req.params

    try{
        const result = await prisma.kategori.findUnique({
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
app.patch('/kategori/:id', async (req, res) => {
    const {id} = req.params;
    const {kategori} = req.body;

    const result = await prisma.kategori.update({
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
app.delete('/kategori/:id', async (req, res) => {
    const {id} = req.params;

    const result = await prisma.kategori.delete({
        where: {
            id: parseInt(id)
        }
    })

    res.json({
        message: `Kategori ${id} Deleted`
    })
})

// CHECK DUPLIKAT KATEGORI
app.get('/checkKategori', async (req, res) => {
    const kategori = req.query.kategori as string | undefined;

    try {
        if (typeof kategori === 'string') {
            const existingCategory = await prisma.kategori.findUnique({
                where: {
                    kategori: kategori
                }
            });

            if (existingCategory) {
                res.json({ exists: true });
            } else {
                res.json({ exists: false });
            }
        } else {
            // Handle kasus ketika kategori bukan string (misalnya jika kategori adalah array, objek, atau undefined)
            res.status(400).json({ error: 'kategori harus berupa string' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan dalam memeriksa kategori.' });
    }
})

app.listen(PORT, () => {
    console.log(`Server in running PORT: ${PORT}`)
})