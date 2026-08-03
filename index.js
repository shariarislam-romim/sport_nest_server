const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();
const app = express();
app.use(cors());
const port = 5000

const uri = process.env.MONGODB_URI;

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);
// console.log(JWKS, 'from jwks')

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = (req, res, next)=>{
    console.log(req.params, 'logger');
    next();
 };

const verifyToken = async (req, res, next)=>{
    const {authorization} = req.headers;
    console.log(req.headers, 'verify token')
    const token = authorization?.split(' ')[1];
    // console.log(token);

    if(!token){
        return res.status(401).json({message: "Unauthorize"});
    }
    try {
    const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks')
    );
    const { payload } = await jwtVerify(token, JWKS)
    // console.log(payload) ;
    req.user = payload;
    console.log(req.user)

    next();
  } catch (error) {
    console.error('Token validation failed:', error)
    return res.status(401).json({message: "Unauthorize"});
  }

    
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const db = client.db("Sport_nestdb")
    const facilityCollect = db.collection("facilities");

 app.get("/facilities",async(req, res)=> {
    const {search} = req.query;

    let cursor;
    if(search){
       cursor = facilityCollect.find({ name : search})
    }else{
        cursor= facilityCollect.find();
    }

    const result = await cursor.toArray();
    // console.log(result,'this')
    res.send(result);
 })

 app.get("/facilities/:id",
    logger,verifyToken,
 async(req, res)=> {
    // console.log(req.user, 'req')
    const {id} = req.params;
    // console.log(id)
    const query = { _id:id}
    const result = await facilityCollect.findOne(query)
    res.send(result);
 })


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})