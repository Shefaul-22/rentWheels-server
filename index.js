const express = require('express');
const app = express();
const cors = require('cors');
// For hiding secrity key using dotenv
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


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
        const bookingsCollection = db.collection("bookings");


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

        // cars related apis 
        app.post('/cars', async (req, res) => {

            const newCar = req.body;
            const result = await carsCollection.insertOne(newCar);
            res.send(result);
        });

        app.get('/cars', async (req, res) => {
            const cursor = carsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        // newest cars
        app.get("/cars/newest", async (req, res) => {
            const cursor = carsCollection.find().sort({ createdAt: -1 });
            const newestCars = await cursor.toArray();

            res.send(newestCars);
        });

        // Top rated cars related api
        app.get("/cars/topRatedCars", async (req, res) => {
            const cursor = carsCollection.find().sort({ rentPrice: -1 }).limit(3);
            const newestCars = await cursor.toArray();

            res.send(newestCars);
        });

        // random cars for header
        app.get("/cars/randomCars", async (req, res) => {
            try {
                const cars = await carsCollection.find().toArray();

                if (cars.length <= 3) {
                    return res.send(cars);
                }

                const randomCars = cars.sort(() => Math.random() - 0.5);

                res.send(randomCars);

            } catch (error) {
                res.status(500).send({
                    message: "Failed to load cars",
                    error: error.message
                });
            }
        });

        // browse all cars
        app.get("/cars/browsecars", async (req, res) => {
            const cursor = carsCollection.find().sort({ createdAt: -1 });
            const result = await cursor.toArray();

            res.send(result);
        });

        app.get("/cars/:id", async (req, res) => {
            try {
                const id = req.params.id;
                // console.log(id)
                const query = { _id: new ObjectId(id) }
                const car = await carsCollection.findOne(query);
                if (!car) {
                    return res.status(404).send({ message: "Car not found" });
                }
                res.send(car);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Failed to fetch car details" });
            }
        });

        // Update car data api here

        app.patch("/cars/:id", async (req, res) => {
            const { id } = req.params;
            const updateFields = req.body;

            try {
                const result = await carsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateFields }
                );

                if (result.modifiedCount > 0) {
                    res.status(200).send({ message: "Car updated successfully" });
                } else {
                    res.status(400).send({ message: "No changes made" });
                }
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Update failed" });
            }
        });

        // Delete a car from mylisting
        app.delete("/cars/:id", async (req, res) => {
            const { id } = req.params;


            const query = { _id: new ObjectId(id) }

            // if (query) {
            //     return res.status(400).send({ message: "Invalid car ID" });
            // }

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid car ID" });
            }




            try {

                const result = await carsCollection.deleteOne(query);
                if (result.deletedCount > 0) {
                    res.status(200).send({ message: "Car deleted successfully" });
                } else {
                    res.status(404).send({ message: "Car not found" });
                }
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Delete failed" });
            }
        });

        // Booking related api

        app.post("/bookings", async (req, res) => {
            try {
                const { carId, userName, userEmail, location } = req.body;

                // who book the car confirmation
                if (!carId || !userName || !userEmail) {
                    return res.send({ message: "Missing required fields" });
                }


                const car = await carsCollection.findOne({ _id: new ObjectId(carId) });
                if (!car) {
                    return res.status(404).send({ message: "Car not found" });
                }


                if (car.status === "unavailable") {
                    return res.send({ message: "Car already booked" });
                }



                const booking = {
                    carId: new ObjectId(carId),
                    userName,
                    userEmail,
                    location,
                    bookedAt: new Date(),
                };
                await bookingsCollection.insertOne(booking);

                // update  car status available or not
                await carsCollection.updateOne(
                    { _id: new ObjectId(carId) },
                    { $set: { status: "unavailable" } }
                );


                return res.send({ success: true, message: "Car booked successfully" });
            } catch (error) {
                console.error(" Booking error:", error);
                return res.status(500).send({ message: "Internal Server Error" });
            }
        });


        app.get("/bookings", async (req, res) => {
            const email = req.query.email;
            // console.log(email)
            const query = {}
            if (email) {
                query.userEmail = email;
            }
            const cursor = bookingsCollection.find(query)
            const result = await cursor.toArray();
            res.send(result)
        })


        app.delete("/bookings/:id", async (req, res) => {
            try {
                const bookingId = req.params.id;

                // 1️⃣ Find the booking
                const booking = await bookingsCollection.findOne({
                    _id: new ObjectId(bookingId),
                });

                if (!booking) {
                    return res.status(404).send({
                        success: false,
                        message: "Booking not found",
                    });
                }

                // delete booking
                await bookingsCollection.deleteOne({ _id: new ObjectId(bookingId) });

                // Update car status to available
                await carsCollection.updateOne(
                    { _id: new ObjectId(booking.carId) },
                    { $set: { status: "available" } }
                );

                res.status(200).send({
                    success: true,
                    message: "Booking cancelled successfully",
                });

            } catch (error) {
                console.error(error);
                res.status(500).send({
                    success: false,
                    message: "Failed to cancel booking",
                });
            }
        });

        // My listing related api
        app.get("/myListing", async (req, res) => {
            const email = req.query.email;
            // console.log(email)
            const query = {}
            if (email) {
                query.providerEmail = email;
            }
            const cursor = carsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }

    finally {

    }
}
run().catch(console.dir);
// 
app.listen(port, () => {
    console.log(`RentWheels server is running on port: ${port}`);
})