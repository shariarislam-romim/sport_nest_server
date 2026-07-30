const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
dotenv.config();
const app = express();
app.use(cors());
const port = 5000


const uri = "mongodb+srv://sport_nest:ymFdBh7RHHFdGvM4@cluster0.lt4h3no.mongodb.net/?appName=Cluster0";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const db = client.db("Sport_nestdb")
    const facilityCollect = db.collection("facilities");

 app.get("/facilities",async(req, res)=> {
    const cursor = facilityCollect.find();
    const result = await cursor.toArray();
    res.send(result);
 })

 app.get("/facilities/:id",async(req, res)=> {
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