const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Middleware //
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// const logger = (req, res, next) => {
//     console.log("inside the logger");
//     next();
// }

// const verifyToken = (req, res, next) => {
//     const token = req?.cookies?.token;

//     if(!token){
//         return res.status(401).send({message: "Unauthorized access"})
//     }

//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//         if(err){
//             res.status(401).send({message: "Unauthorized acces"})
//         }
//         req.user = decoded;
//         next();
//     })
// }


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crzce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


        // Auth Related API's //
        // app.post('/jwt', async(req, res) => {
        //     const user = req.body;
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        //         expiresIn: '5h'
        //     })

        //     res
        //     .cookie('token', token, {
        //         httpOnly: true,
        //         secure: false
        //     })
        //     .send({success: true})
        // })

        
        // Jobs related API's //
        const jobsCollection = client.db('jobPortal').collection('jobs');
        const jobApplicationCollection = client.db('jobPortal').collection('job_applications');

        

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Historical Articrafts server is running')
});

app.listen(port, () => {
    console.log(`The server is running at port: ${port}`);
})