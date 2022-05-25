const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();


// middlewares
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hjons.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const bannerSlideCollection = client.db('techParts').collection('bannerSlideCollection');
        const questionCollection = client.db('techParts').collection('questionCollection');
        const reviewCollection = client.db('techParts').collection('reviewCollection');
        const productCollection = client.db('techParts').collection('productCollection');
        const orderCollection = client.db('techParts').collection('orderCollection');

        // get the home banner silder data
        app.get('/home-slider', async (req, res) => {
            const homeSliders = await bannerSlideCollection.find().toArray();
            res.send({ success: true, data: homeSliders });
        });

        // get all questions and answers
        app.get('/question', async (req, res) => {
            const questions = await questionCollection.find().toArray();
            res.send({ success: true, data: questions });
        });

        // get all reviews
        app.get('/review', async(req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send({success: true, data: reviews});
        });

        // get all products
        app.get('/product', async(req, res) => {
            const products = await productCollection.find().toArray();
            res.send({success: true, data: products});
        });

        // get single product
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });

        // update  product 
        app.put('/product/:id', async(req, res) => {
            const id = req.params.id;
            const requestProduct = req.body;
            const updatedQuantity = requestProduct.quantity;
            const updatedSold = requestProduct.sold;
            const filter = {_id: ObjectId(id)};
            const options = {upsert: true};
            const updatedProduct = {
                $set: {
                    availableQuantity: updatedQuantity,
                    sold : updatedSold
                }
            };
            const result = await productCollection.updateOne(filter, updatedProduct, options);
            res.send({success: true, message: 'Updated Succesfully', result});
        });


        app.post('/order', async (req, res) => {
            const newProduct = req.body
            const result = await orderCollection.insertOne(newProduct);
            res.send({ success: true, message: "Succesfully Added", result });
        });

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