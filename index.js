const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;


require('dotenv').config();

const app = express();

//middleware
app.use(cors())
app.use(express.json())

// const mongodb =luxuryliving
// const pass =da81E6lHnLjdgFWw




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kdph3.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const verifyJWT = (req,res,next) =>{
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "unAuthorized access" })
    }
    const token = authHeader.split(" ")[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {

        if (err) {
            return res.status(403).send({ message: "forbidden access" })
        }
        req.decoded = decoded;
        next()
    });
}

async function run() {
    try {
        await client.connect()
        const servicecollection = client.db("luxuryliving").collection("service");
        const userCollection = client.db('luxuryliving').collection('users');
        const bookingCollection = client.db('luxuryliving').collection('bookings');
        console.log('connected');


        // set user data
        app.put('/user/:email',async(req,res)=>{
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            console.log(filter);
            const options = { upsert: true }
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
            res.send({ result, token })
         })

         app.get('/users', async (req, res) => {

            const result = await userCollection.find().toArray()
            res.send(result)
        })

        // post service 
        app.post('/service',async(req,res)=>{
            const service = req.body;
            const result = await servicecollection.insertOne(service)
            res.send(result)
        })
        

        // get all service
        app.get('/services',async(req,res)=>{
            const result = await servicecollection.find().toArray()
            res.send(result)
        })

        //get specific service
        app.get('/service/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const service = await servicecollection.findOne(query)
            // console.log(service);
            res.send(service)
        })

        // create payment intent with stipre and post in database 

        app.post('/create-payment-intent',verifyJWT,async(req,res)=>{
            const price = req.body.price;
            const amount = price * 100;
            if(amount !== 0){
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card']
                });
                res.send({
                    clientSecret: paymentIntent.client_secret,
                })
            }
        })

        // post your booking service in database

        app.post('/booking',verifyJWT,async(req,res)=>{
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        // get all booking

        app.get('/booking/:email', verifyJWT, async (req, res) => {
            const userEmail = req.params.email
            const result = await bookingCollection.find({ userEmail }).toArray()
            res.send(result)
        })

        // get specific booking by user email
        app.get('/allbookings',async(req,res)=>{
            const result = await bookingCollection.find().toArray()
            res.send(result)
        })

        // get user by its role
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email })
            console.log(user);
            const isAdmin = user.role === 'admin'
            res.send({ admin: isAdmin })
        })

        //make user as admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' },
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send({ result })

        })


    }
    finally {

    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('luxury living are running')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})