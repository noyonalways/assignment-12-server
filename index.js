const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const colors = require('colors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const app = express();


// middlewares
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized user' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden' })
        }
        req.decoded = decoded;
        next();

    })
};



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hjons.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        console.log(`Database Connected Successfully! ✔`.cyan.bold);
        const portfolioCollection = client.db('techParts').collection('portfolioCollection');
        const bannerSlideCollection = client.db('techParts').collection('bannerSlideCollection');
        const questionCollection = client.db('techParts').collection('questionCollection');
        const reviewCollection = client.db('techParts').collection('reviewCollection');
        const productCollection = client.db('techParts').collection('productCollection');
        const orderCollection = client.db('techParts').collection('orderCollection');
        const paymentCollection = client.db('techParts').collection('paymentCollection');
        const userCollection = client.db('techParts').collection('userCollection');

        // get portfolio information
        app.get('/portfolio', async (req, res) => {
            const portfolio = await portfolioCollection.find().toArray();
            res.send(portfolio);
        })

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
        app.get('/review', async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send({ success: true, data: reviews });
        });

        // add new review
        app.post('/review', async (req, res) => {
            const newReview = req.body;
            const result = await reviewCollection.insertOne(newReview);
            res.send({ success: true, data: result });
        });


        // jwt to token sent to ther client side and store use to the database
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });
        });

        // make an user admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const requester = req.decoded.email;
            const requesterAccout = await userCollection.findOne({ email: requester });
            if (requesterAccout.role === 'admin') {
                const updatedDoc = {
                    $set: {
                        role: "admin"
                    }
                };
                const result = await userCollection.updateOne(filter, updatedDoc);
                res.send(result)
            } else {
                res.status(403).send({ message: 'Forbidden' })
            }

        });

        // check user admin
        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ isAdmin, message: `This is admin ${isAdmin}` });
        })


        // get all users
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        // get all products
        app.get('/product', verifyJWT, async (req, res) => {
            const products = await productCollection.find().toArray();
            res.send({ success: true, data: products });
        });

        // delete product from product colleciton
        app.delete('/product/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await productCollection.deleteOne(query);
            console.log(id);
            res.send({success: true, message: "Deleted Succesfully", result});
        })

        // get single product
        app.get('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });

        // add new prodcut
        app.post('/product', verifyJWT, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send({ success: true, data: result });
        });


        // update  product 
        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const requestProduct = req.body;
            const updatedQuantity = requestProduct.quantity;
            const updatedSold = requestProduct.sold;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedProduct = {
                $set: {
                    availableQuantity: updatedQuantity,
                    sold: updatedSold
                }
            };

            const result = await productCollection.updateOne(filter, updatedProduct, options);
            res.send({ success: true, message: 'Updated Succesfully', result });
        });


        //  new order add
        app.post('/order', verifyJWT, async (req, res) => {
            const newProduct = req.body
            const result = await orderCollection.insertOne(newProduct);
            res.send({ success: true, message: "Succesfully Added", result });
        });

        // get all user orders
        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (email) {
                const orders = await orderCollection.find().toArray();
                return res.send(orders);
            } else {
                return res.status(403).send({ message: "Forbidden access" });
            }
        });

        // get specific user orders
        app.get('/myOrder', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const myOrder = await orderCollection.find(query).toArray();
                return res.send(myOrder);
            } else {
                return res.status(403).send({ message: "Forbidden access" });
            }
        });

        // get single order from order collection
        app.get('/myOrder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        });

        //  add transation id
        app.patch('/order/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'pending',
                    paid: true,
                    transactionId: payment.transactionId,
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);

        });

        // delete order
        app.delete('/order/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await orderCollection.deleteOne(query);
            res.send({success: true, message: "Deleted Succesfully", result});
        });

        // products get status
        app.put('/status/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                    status: 'shipped',
                }
            }
            const result = await orderCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })


        // make payment
        app.post('/create-payment-intent',  async (req, res) => {
            const product = req.body;
            const price = product.price;
            // console.log(price);
            const amout = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amout,
                currency: "usd",
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
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
    console.log(`App is runnng on ${port}`.yellow.bold, `http://localhost:${port}`);
})