require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()

//config JSON response
app.use(express.json())

//Models
const User = require('./models/User')

//Public Route / home
app.get('/', (req,res) => {
    res.status(200).json({msg: "Bem vindo a API"})
})

//private Route
app.get('/user/:id',checkToken, async(req,res) => {

    const id = req.params.id

    //check if user exists
    const user = await User.findById(id, '-password')

    if(!user){
        return res.status(404).json({msg: 'Usuário não encontrado'})
    }

    res.status(200).json({ user })

})

//middleware
function checkToken(req,res,next) {

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(" ")[1]

    if(!token){
        return res.status(401).json({msg: 'Acesso negado!'})
    }

    try {
        
        const secret = process.env.SECRET

        jwt.verify(token, secret)

        next()

    } catch (error) {
        console.log(error)

        res.status(400).json({msg: "Token inválido!"})
    }
}



//register user
app.post('/auth/register', async(req,res) => {

    const {name, email, password, confirmPassword} = req.body

    //validations
    if(!name){
        return res.status(422).json({msg : 'O nome é obrigatório!'})
    }

    if(!email){
        return res.status(422).json({msg : 'O email é obrigatório!'})
    }
    if(!password){
        return res.status(422).json({msg : 'A senha é obrigatório!'})
    }

    if(password !== confirmPassword){
        return res.status(422).json({msg: "As senhas não conferem!"})
    }

    //check if user exists
    const userExists = await User.findOne({email : email})

    if(userExists){
        return res.status(422).json({msg: "Email já cadastrado,por favor utilize outro e-mail"})
    }

    //create password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password,salt)

    //create user
    const user = new User({
        name,
        email,
        password: passwordHash,
    })

    try {
        
        await user.save()

        res.status(201).json({ msg: 'Usuário criado com sucesso!'})

    } catch (error) {
        console.log(error)

        res
            .status(500)
            .json({
                msg: 'Erro no servidor, tente novamente mais tarde!'
            })
    }

})

//login user
app.post("/auth/login", async(req,res) => {

    const {email, password} = req.body

    //validation
    if(!email){
        return res.status(422).json({msg : 'O email é obrigatório!'})
    }
    if(!password){
        return res.status(422).json({msg : 'A senha é obrigatório!'})
    }

    //check if user exists
    const user = await User.findOne({ email: email})

    if(!user){
        return res.status(404).json({msg: 'Usuário não encontrado!'})
    }

    //check if password match
    const checkPassword = await bcrypt.compare(password, user.password)

    if(!checkPassword){
        return res.status(422).json({msg: 'Senha inválida'})
    }

    try {
        
        const secret = process.env.secret
        const token = jwt.sign({
            id: user._id
        }, 
            secret,
        )

        res.status(200).json({msg: "Autenticação realizada com sucesso", token })

    } catch (err) {
        console.log(err)

        res
            .status(500)
            .json({
                msg: 'Erro no servidor, tente novamente mais tarde!'
            })
        }

})


//credencials
const dbUser = process.env.DB_USER
const dbPassword = process.env.DB_PASS

mongoose.connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster0.x6yami9.mongodb.net/?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(3000)
        console.log("Conectou ao banco!");
    })
    .catch((err) => {
        console.log(err);
    })

