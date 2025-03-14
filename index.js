const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const corsOptions = {
    origin: ['http://localhost:5173',
        'http://localhost:5174',
        'https://artifacts-atlas-phero.netlify.app'

    ],
    credentials: true,
    optionalSuccessStatus: 200,
}

// Middleware //
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "Unauthorized access!!" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized access!!" })
        }
        req.user = decoded;
    })
    next();
}


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
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


        // Generate JWT //
        app.post('/jwt', async (req, res) => {
            const email = req.body;
            console.log(email);
            // Create token //
            const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });
            // console.log(token);
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            })
                .send({ success: true })
        });

        // Clear token from cookie in browser || Logout //
        app.get('/logout', async (req, res) => {
            res.clearCookie('token', {
                maxAge: 0,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            })
                .send({ status: true })
        })

        const artifactsCollection = client.db('historicalArtifacts').collection('artifacts');
        const likedArtifactsCollection = client.db('historicalArtifacts').collection('likedArtifacts');

        // Add a artifact in artifactsCollection //
        app.post('/add-artifact', async (req, res) => {
            const artifactData = req.body;
            const result = await artifactsCollection.insertOne(artifactData);
            res.send(result);
        });

        // Get All artifacts from artifactsCollection //
        app.get('/artifacts', async (req, res) => {
            const result = await artifactsCollection
                .find()
                .sort({ likes: -1 })
                .limit(6)
                .toArray();
            res.send(result);
        });

        // Get a specific artifact form artifactsCollection //
        app.get('/artifact/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await artifactsCollection.findOne(query);
            res.send(result);
        });

        // Delete a specific artifact from artifactsCollection //
        app.delete('/artifact/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await artifactsCollection.deleteOne(query);
            res.send(result);
        })

        // Get specific artifacts from artifactsCollection by an email //
        app.get('/artifacts/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { adderEmail: email };
            const result = await artifactsCollection.find(query).toArray();
            res.send(result);
        });

        // Add artifact to likedArtifacts //
        app.post('/add-like', async (req, res) => {
            const likedData = req.body;

            // 1. Check that if this person liked the artifact before //
            const query = { artifactId: likedData.artifactId, likedEmail: likedData.likedEmail };
            const alreadyExist = await likedArtifactsCollection.findOne(query);

            if (alreadyExist) {
                return res.status(400).send("Already liked the artifact");
            }

            // 2. Save the data to likedArtifactsCollection //
            const result = await likedArtifactsCollection.insertOne(likedData);

            // 3. Increase like count in artifacsCollection //
            const filter = { _id: new ObjectId(likedData.artifactId) };
            const update = {
                $inc: { likes: 1 }
            }
            const updateLikesCount = await artifactsCollection.updateOne(filter, update);

            res.send(result);
        });

        app.post('/remove-like', async (req, res) => {
            const { artifactId, likedEmail } = req.body;

            const query = { artifactId, likedEmail };
            const result = await likedArtifactsCollection.deleteOne(query);

            const filter = { _id: new ObjectId(artifactId) };
            const update = {
                $inc: { likes: -1 }
            };
            await artifactsCollection.updateOne(filter, update);

            res.send(result);
        });

        // Get liked artifacts for a specific email //
        app.get('/liked-artifacts/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { likedEmail: email };
            const result = await likedArtifactsCollection.find(query).toArray();
            res.send(result);
        });

        // Get a single liked artifact //
        app.get('/liked-artifact/:id', async (req, res) => {
            const id = req.params.id;
            const query = { artifactId: id };
            const result = await likedArtifactsCollection.find(query).toArray();
            res.send(result);
        })

        // Update an artifact //
        app.put('/update/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const artifactData = req.body;
            const updated = {
                $set: artifactData
            }
            const options = { upsert: true };

            const result = await artifactsCollection.updateOne(query, updated, options);
            res.send(result);
        });

        // Get all artifacts in a different way //
        app.get('/all-artifacts', async (req, res) => {
            const search = req.query.search;
            const sort = req.query.sort;

            let query = {
                artifactName: {
                    $regex: search,
                    $options: 'i'
                }
            }

            let sortOptions = {};
            if (sort) {
                sortOptions = { likes: sort === 'asc' ? 1 : -1 }
            }

            try {
                const result = await artifactsCollection.find(query).sort(sortOptions).toArray();
                res.send(result);
            } 
            catch (error) {
                console.error("Error fetching artifacts:", error);
                res.status(500).send({ error: "Internal Server Error" });
            }
        })


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