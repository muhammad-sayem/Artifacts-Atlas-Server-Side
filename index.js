const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Middleware //
app.use(cors());
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

        const artifactsCollection = client.db('historicalArtifacts').collection('artifacts');
        const likedArtifactsCollection = client.db('historicalArtifacts').collection('likedArtifacts');

        // Add a artifact in artifactsCollection //
        app.post('/add-artifact', async(req, res) => {
            const artifactData = req.body;
            const result = await artifactsCollection.insertOne(artifactData);
            res.send(result);
        });

        // Get All artifacts from artifactsCollection //
        app.get('/artifacts', async(req, res) => {
            const result = await artifactsCollection.find().toArray();
            res.send(result);
        });

        // Get a specific artifact form artifactsCollection //
        app.get('/artifact/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await artifactsCollection.findOne(query);
            res.send(result);
        });

        // Get specific artifacts from artifactsCollection by an email //
        app.get('/artifacts/:email', async(req, res) => {
            const email = req.params.email;
            const query = {adderEmail: email};
            const result = await artifactsCollection.find(query).toArray();
            res.send(result);
        });

        // Add artifact to likedArtifacts //
        app.post('/add-like', async(req, res) => {
            const likedData = req.body;
            const result = await likedArtifactsCollection.insertOne(likedData);
            res.send(result);
        });

        

        

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