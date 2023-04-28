const express = require('express');

const app = express();

const ioredis = require('ioredis')

const redis = new ioredis();


const {Router} = require('express');

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');

require('dotenv').config();

app.use(express.json())

const { UserModel } = require('./models/user.model');

const { connection } = require('./db');


app.post('/register', async (req,res)=>{

    const {Email, Password} = req.body
    
    try {
        
        const userPresent = await UserModel.findOne({Email});

        if(userPresent){
            return res.status(400).send({
                msg:"User already exits"
            })
        }

        const hashPassword = bcrypt.hashSync(Password, 5);

        const newuser = new UserModel({Email, Password:hashPassword});

        await newuser.save();

        return res.status(200).send({
            msg:"Register Successfull",
            user: newuser
        })

    } catch (error) {
        
        return res.status(500).send({error:error.message, msg:"Something went wrong"})

    }

})

app.post('/login', async (req,res)=>{
    
    const { Email, Password } = req.body
    
    try {
        
        const userPresent = await UserModel.findOne({Email});

        if(!userPresent){
            return res.status(400).send({
                msg:"User doesn't exits. Signup first"
            })
        }

        const verifyPassword = bcrypt.compareSync(Password, userPresent.Password);

        if(verifyPassword){

            const accesstoken = jwt.sign({UserID:userPresent._id, Role:userPresent.Role}, process.env.AccessToken, {expiresIn:"1m"});

            // add token inside redis 
            redis.set(Email, accesstoken, "EX", 60)

            return res.send({
                msg:"Login Successfull"
            })

        }else{

            return res.status(400).send({
                msg:"Invalid Password"
            })

        }
        

        

    } catch (error) {
        
        return res.status(500).send({error:error.message, msg:"Something went wrong"})

    }

})

app.get('/logout', async (req,res)=>{

    const { Email } = req.body || req.query;

    if(!Email){

        return res.status(404).send("Email not found");

    }


    redis.get(Email, async (err,data)=>{

        if(err){

            return res.status(400).send({"error":err});

        }else{

            console.log(data);

            if(data){

                redis.get("blacklistedArr",(err,result)=>{

                    if(result){

                        result = JSON.parse(result);
                        result.push(data);
                        redis.set("blacklistedArr", JSON.stringify(result), "EX", 120);

                    }else{

                        result = [];
                        result.push(data);
                        redis.set("blacklistedArr", JSON.stringify(result), "EX", 120);

                    }
                })

                return res.status(200).send({
                    msg:"logout Successfull"
                })

            }else{

                return res.status(400).send("token expired");

            }
        }
    })
    
})






app.get("/blogs",auth, (req,res)=>{
    res.status(200).send("blogs")
})


app.listen(3000,async ()=>{
    try {
        await connection
        console.log('connected');
    } catch (error) {
        console.log(error);
    }
    console.log(`server is running`);
})



// middlewares
function auth(req,res,next){

    const { Email } = req.body || req.query;

    if(!Email){

        return res.status(404).send("Email not found");

    }


    redis.get(Email, (err,data)=>{

        if(err){

            return res.status(400).send({"error":err})

        }else{

            console.log(data);

            if(data){

                redis.get("blacklistedArr",(err,result)=>{

                    if(result){

                        result = JSON.parse(result);
                        console.log(result);

                        if(result.includes(data)){

                            return res.status(400).send("blacklisted ho tum")

                        }else{
                            console.log('first se ja rha hu');
                            next();
                            
                        }
                        
                    }else{
                        console.log('second se ja rha hu');

                        next();

                    }
                })

            }else{

                return res.status(400).send("token expired")

            }
        }
    })
}