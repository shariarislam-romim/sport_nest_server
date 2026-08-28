const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
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
    const bookingCollect = db.collection("bookings");

 app.get("/facilities",async(req, res)=> {
    try{
        const {search} = req.query;
        let cursor = {};

        if(search){
       cursor ={ 
        name: {
            $regex: search,
            $options: 'i',
       },
    };
    }

    const result= await facilityCollect.find(cursor).toArray();
    res.send(result);


   } catch (error) {
        console.error(error);
   

     res.status(500).json({
            message: "Failed to fetch facilities",
        });
    }
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
 });

 app.get("/booking/:userId",verifyToken, async(req,res)=>{
    const {userId} = req.params;
    const result = await bookingCollect.find({userId:userId}).toArray();
    res.send(result)

 })

 app.post("/booking/:id",verifyToken,async(req,res)=>{
    const {id} = req.params;
    const bookingData = req.body;

    const facility = await facilityCollect.findOne({_id:id});
    if(!facility){
        res.status(404).json({message: 'Facility Not Found'})
    }
    const alreadyBooked = await bookingCollect.findOne({
    facilityId: id,
    bookingDate: bookingData.bookingDate,
    timeSlot: bookingData.timeSlot,
    });

    if (alreadyBooked) {
    return res.status(409).json({
        message: "This time slot is already booked.",
    });
    }
    await facilityCollect.updateOne({_id:id},{
        $inc: {bookingCount: 1},
        $set: {
            lastBookingAt: new Date()
        },
    });
    
    const result = await bookingCollect.insertOne({
        ...bookingData,
        facilityId: id,
        status: "Booked",
        bookedAt: new Date()
    });
    res.send(result);
 })

 const allBookings = await bookingCollect.find({}).toArray();

console.log(
    allBookings.map((booking) => ({
        id: booking._id,
        idAsString: booking._id.toString(),
        facility: booking.facilityName
    }))
);

app.delete("/booking/:id", verifyToken, async (req, res) => {
    
    try {
        const { id } = req.params;

        console.log("DELETE ID:", id);

        const allBookings = await bookingCollect.find({}).toArray();

console.log(
    allBookings.map((booking) => ({
        id: booking._id,
        idAsString: booking._id.toString(),
        facility: booking.facilityName
    }))
);

        const booking = await bookingCollect.findOne({
            $expr: {
                $eq: [
                    { $toString: "$_id" },
                    id
                ]
            }
        });

        console.log("FOUND BOOKING:", booking);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const deleteResult = await bookingCollect.deleteOne({
            _id: booking._id
        });

        console.log("DELETE RESULT:", deleteResult);

        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking could not be deleted"
            });
        }

        if (booking.facilityId) {
            await facilityCollect.updateOne(
                {
                    _id: booking.facilityId
                },
                {
                    $inc: {
                        bookingCount: -1
                    }
                }
            );
        }

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully"
        });

    } catch (error) {
        console.error("DELETE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel booking",
            error: error.message
        });
    }
});


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