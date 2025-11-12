const express = require('express');
const app = express();
const cors = require('cors');
// For hiding secrity key using dotenv
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000;


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/?appName=crud-server-practices`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Middleware 
app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
    res.send("RentWheels server is running");
})

// 
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db('rentwheels-db');
        const usersCollection = db.collection('users')
        const carsCollection = db.collection('cars')


        // Users related apis here
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;

            const query = { email: email }

            const existingUser = await usersCollection.findOne(query)

            if (existingUser) {
                res.send({ message: 'Users already exists' })
            }
            else {

                const result = await usersCollection.insertOne(newUser)
                res.send(result)
            }


        })

        app.post('/cars', async (req, res) => {
            const newCar = req.body;
            const result = await carsCollection.insertOne(newCar);
            res.send(result);
        });

        app.get('/cars', async(req, res) => {
            const cursor = carsCollection.find(); 
            const result = await cursor.toArray();
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }

    finally {

    }
}
run().catch(console.dir);
// 
app.listen(port, () => {
    console.log(`RentWheels server is running on port: ${port}`);
})