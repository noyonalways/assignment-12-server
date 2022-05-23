const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();


// middlewares
app.use(cors());
app.use(express());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hjons.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const bannerSlideCollection = client.db('techParts').collection('bannerSlideCollection');
        const questionCollection = client.db('techParts').collection('questionCollection');

        // get the home banner silder data
        app.get('/home-slider', async (req, res) => {
            const homeSliders = await bannerSlideCollection.find().toArray();
            res.send({ success: true, data: homeSliders });
        });

        // get all questions and answers
        app.get('/question', async (req, res) => {
            const questions = await questionCollection.find().toArray();
            res.send({ success: true, data: questions });
        })

    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

// testing server
app.get('/', (req, res) => {
    res.send('Manifacturer web server is runnig')
});

app.listen(port, () => {
    console.log('Listening to port', port);
})