const express = require('express')
const router = express.Router()
require('dotenv').config();
const mongoose = require('mongoose')

const User = require("../models/user")
const Candidate = require("../models/candidate")

const {jwtAuthMiddleware,generateToken} = require('../jwt')

const checkAdminRole = async(userId)=>{
    try{
        const user = await User.findById(userId);
        return user.role === 'admin';
    }
    catch(err){
        return false
    }
}

//POST route to add a candidate
router.post('/',jwtAuthMiddleware, async (req, res) => {
    try {
            if(! await checkAdminRole(req.user.id))
                return res.status(403).json({message:"User does not have admin access."})
            
        const data = req.body //assuming request body contains the Candidate data

        //create a new Candidate document using mongoose model
        const newCandidate = new Candidate(data);

        //save the new user to the database
        const response = await newCandidate.save();
        console.log("Data saved.")

        res.status(200).json({response:response})
    }
    catch (error) {
        console.log(error)
        res.status(500).json({err:"internal server error"})
    }
})


//update candidate based on unique id
router.put('/:candidateID/',jwtAuthMiddleware,async(req,res)=>{
    try{
        if(! await checkAdminRole(req.user.id))
            return res.status(403).json({message:"User does not have admin access."})

        const candidateId = req.params.candidateID //extract the id from the url parameter
        const updatedCandidateData = req.body //updated data for the candidate

        const response = await Candidate.findByIdAndUpdate(candidateId, updatedCandidateData, {
            new: true, //return the updated document
            runValidators: true //run mongoose validation
        })

        if (!response) {
            return res.status(404).json({ error: "Candidate not found." })
        }

        console.log("Candidate data updated")
        res.status(200).json(response)
    }
    catch(err){
        console.log(err.message)
        res.status(500).json({err:"Internal server error"})
    }
})


//delete candidate
router.delete('/:candidateID/',jwtAuthMiddleware,async(req,res)=>{
    try{
        if(! await checkAdminRole(req.user.id))
            return res.status(403).json({message:"User does not have admin access."})

        const candidateId = req.params.candidateID //extract the id from the url parameter
        

        const response = await Person.findByIdAndDelete(candidateId)

        if (!response) {
            return res.status(404).json({ error: "Candidate not found." })
        }

        console.log("Candidate deleted")
        res.status(200).json(response)
    }
    catch(err){
        console.log(err.message)
        res.status(500).json({err:"Internal server error"})
    }
})

//profile route, get candidate based on their profile by jwttoken authorization
router.get('/:candidateID/profile/',jwtAuthMiddleware,async(req,res)=>{
    try{
        if(! await checkAdminRole(req.user.id))
            return res.status(403).json({message:"User does not have admin access."})

        const candidateId = req.params.candidateID //extract the id from the url parameter
        const candidate = await Candidate.findById(candidateId)

        if (!candidate){
            return res.status(404).json({message:"Candidate not found"})
        }

        res.status(200).json({candidate});
    }
    catch(err){
        console.log(err)
        res.status(500).json({error:"Internal server error"})
    }
})

//lets start voting
router.post("/vote/:candidateId",jwtAuthMiddleware,async(req,res)=>{
    //no admin can vote
    //user can vote only once

    const candidateId=req.params.candidateId
    const userId = req.user.id
    try{

        const candidate = await Candidate.findById(candidateId)
        if (!candidate){
            return res.status(404).json({message:"Candidate not found"})
        }
        
        const user = await User.findById(userId)
        if (!user){
            return res.status(404).json({message:"User not found"})
        }

        if(user.isVoted){
            return res.status(400).json({message:"You have already voted"})
        }

        if(user.role === 'admin'){
            return res.status(403).json({message:"Admin is not allowed to cast vote"})
        }

        //udpdate candidate document to record the vote
        candidate.votes.push({user:userId});
        candidate.voteCount++;
        await candidate.save();

        //update user document
        user.isVoted=true;
        await user.save();

        res.status(200).json({message:"Vote recorded successfully"})
    }
    catch(err){
        console.log(err.message)
        res.status(500).json({err:"Internal server error"})
    }
})

//vote count
router.get('/vote/count', async (req,res)=>{
    try{
        //find all the candidates and sort them by vote count in descending order
        const candidate = await Candidate.find().sort({voteCount:"desc"}); 

        //map the candidates to only return their name and votecount
        const voteRecord = candidate.map((data)=>{
            return {
                party:data.party,
                votes:data.voteCount
            }
        })

        res.status(200).json(voteRecord);
    }
    catch(err){
        console.log(err.message)
        res.status(500).json({err:"Internal server error"})
    }
})

//get list of candidates
router.get('/list',async(req,res)=>{
    try{
        const candidateRecords = await Candidate.find().sort({name:'asc'});

        const candidateList = candidateRecords.map((data)=>{
            return{
                name:data.name,
                party:data.party
            }
        })

        res.status(200).json(candidateList);
    }
    catch(err){
        res.status(500).json({err:"Internal server error"})
    }
})

module.exports = router;