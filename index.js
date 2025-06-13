const express = require('express');
const app = express();
const mongo = require('mongoose');
require('dotenv').config({ path: 'secret.env' });

const nodeEnv = process.env.nodeEnv || 'dev';
const port = 8080;

if (nodeEnv === 'dev') {
    const cors = require('cors');
    app.use(cors());
} else {

}

app.use(express.json());

const connectDB = async () => {
    try {
        await mongo.connect(process.env.DBURI, {
            serverApi: {
                version: "1",
                strict: true,
                deprecationErrors: true,
            }
        });
        console.log('DB Connected Successfully!');
    } catch (err) {
        if (err) {
            console.log(err.message);
            process.exit(1);
        }
    }
}

connectDB();

const polygonRouter = require('./routes/polygon.js');

app.listen(port, () => {
    console.log('Listening on port ' + port);
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/api', polygonRouter);