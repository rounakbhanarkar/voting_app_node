const express = require('express')
const router = express.Router()
const User = require("../models/user")
const mongoose = require('mongoose')
require('dotenv').config();

const {jwtAuthMiddleware,generateToken} = require('../jwt')


//POST route to add a User
router.post('/signup', async (req, res) => {
    try {
        const data = req.body //assuming request body contains the User data

        //create a new user document using mongoose model
        const newUser = new User(data);
        
        if(data.role==="admin"){
            const checkAdmin = await User.findOne({role:"admin"});
            if (checkAdmin){
                return res.status(409).json({error:"Admin is already created, cannot create multiple admin account"})
            }
        }

        //save the new user to the database
        const response = await newUser.save();
        console.log("Data saved.")

        const payload = {
            id:response.id,
        }
        const token = generateToken(payload)

        res.status(200).json({response:response,token:token})
    }
    catch (error) {
        console.log(error)
        res.status(500).json({err:"internal server error"})
    }
})

//login route
router.post('/login',async(req,res)=>{
    try{
        //extract aadharCardNumber and password from the request body
        const {aadharCardNumber, password} = req.body

        //find user by aadharCardNumber
        const user = await User.findOne({aadharCardNumber:aadharCardNumber})

        //if user does not exist or password does not match return error
        if(!user || !(await user.comparePassword(password))) 
        { 
            return res.status(401).json({error:"Invalid aadharCardNumber or password"})
        }

        //generate token
        const payload = {
            id: user.id,
        }

        const token = generateToken(payload);

        //return token as response
        res.json({token})
    }
    catch(err){
        console.log(err)
        res.status(500).json({error:"Internal server error"})
    }
})

//profile route, get user based on their profile by jwttoken authorization
router.get('/profile',jwtAuthMiddleware,async(req,res)=>{
    try{
        const userData = req.user;
        const userId = userData.id;
        const user = await User.findById(userId);

        res.status(200).json({user});
    }
    catch(err){
        console.log(err)
        res.status(500).json({error:"Internal server error"})
    }
})



//update user based on unique id
router.put('/profile/password',jwtAuthMiddleware, async(req,res)=>{
    try{
        // const validpersonId = mongoose.Types.ObjectId.isValid(req.params.id)
        const userId = req.user.id //extract the id from the token
        const {currentPassword, newPassword} = req.body //extract current and new password from request body

        //find user by user id
        const user = await User.findById(userId)

        //if password does not match return error
        if(!(await user.comparePassword(currentPassword))) { 
                return res.status(401).json({error:"Invalid password"})
        }

        //update the user's password
        user.password = newPassword;
        await user.save();

        console.log("Password updated")
        res.status(200).json({message:"Password updated"})

    }
    catch(err){
        console.log(err.message)
        res.status(500).json({err:"Internal server error"})
    }
})


module.exports = router;