const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;
const etag = require('etag');
const redis = require('redis');
const Ajv = require('ajv');
const addFormats = require("ajv-formats");
const schema = require('./schema/schema.json')
const patchschema = require('./schema/patchschema.json')

const redisClient = redis.createClient({
    url: 'redis://127.0.0.1:6379'
});

redisClient.connect();

app.use(express.json());

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client();
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer')) {
            throw new Error('Authorization header missing or invalid');
        }

        const token = authHeader.split(' ')[1];
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: '68919924097-h5fd25j064tapd3ttko8p6k759b8h426.apps.googleusercontent.com',
        });
        const payload = ticket.getPayload();
        req.user = payload;
        next();
    } catch (error) {
        res.status(401).send({ message: 'Unauthorized' });
    }
}

app.post('/v1/plan', verifyToken, async (req, res) => {
    const ajv = new Ajv();
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(req.body);

    if (!valid) {
        return res.status(400).send({ message: "Validation failed", errors: validate.errors });
    }

    // Flatten and store the data
    const flattenedData = flattenAndStore(req.body);

    const objectId = req.body.objectId;
    if (!objectId) {
        return res.status(400).send({ message: "Missing objectId in the request body." });
    }

    // Store the flattened data in Redis
    for (const entry of flattenedData) {
        await redisClient.set(entry.id, entry.entry);
    }

    // Get the stored data string
    const dataString = await redisClient.get(objectId);

    // Generate ETag from the stored data
    const generatedEtag = etag(dataString);

    // Set ETag header and send response
    res.set('ETag', generatedEtag);
    res.status(201).send(JSON.parse(dataString));
});


app.get('/v1/plan/:id', verifyToken, async (req, res) => {
    const objectId = req.params.id;

    try {
        const dataString = await redisClient.get(objectId);
        if (dataString) {
            const generatedEtag = etag(dataString);

            const clientEtag = req.headers['if-none-match'];

            if (clientEtag === generatedEtag) {
                res.status(304).end();
            } else {
                res.set('ETag', generatedEtag);
                res.status(200).json(JSON.parse(dataString));
            }
        } else {
            res.status(404).send({ message: 'Data not found' });
        }
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

app.delete('/v1/plan/:id', verifyToken, async (req, res) => {
    const objectId = req.params.id;
    const ifMatchHeader = req.headers['if-match'];

    try {
        const dataString = await redisClient.get(objectId);
        if (dataString) {
            const currentEtag = etag(dataString);

            if (!ifMatchHeader || ifMatchHeader !== currentEtag) {
                return res.status(412).send({ message: 'Precondition failed - ETag mismatch' });
            }

            await redisClient.del(objectId);
            res.status(204).send({ message: 'Data deleted successfully' });
        } else {
            res.status(404).send({ message: 'Data not found' });
        }
    } catch (error) {
        console.error('Error deleting data:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

app.patch('/v1/plan/:id', verifyToken, async (req, res) => {
    const ajv = new Ajv();
    addFormats(ajv);
    const objectId = req.params.id;
    const patchData = req.body;
    const ifMatchHeader = req.headers['if-match'];

    try {
        // Validate the request body against the JSON schema
        const validate = ajv.compile(patchschema);
        const valid = validate(patchData);
        
        if (!valid) {
            return res.status(400).json({ message: 'Invalid patch data', errors: validate.errors });
        }

        const dataString = await redisClient.get(objectId);
        if (dataString) {
            const currentEtag = etag(dataString);

            if (!ifMatchHeader || ifMatchHeader !== currentEtag) {
                return res.status(412).send({ message: 'Precondition failed - ETag mismatch' });
            }

            const planData = JSON.parse(dataString);

            // Apply the patch to the existing data
            if (patchData.linkedPlanServices) {
                planData.linkedPlanServices = [...planData.linkedPlanServices, ...patchData.linkedPlanServices];
            }

            // Update the data in Redis
            await redisClient.set(objectId, JSON.stringify(planData));

            // Generate and send ETag
            const generatedEtag = etag(JSON.stringify(planData));
            res.set('ETag', generatedEtag);

            res.status(200).json(planData);
        } else {
            res.status(404).send({ message: 'Data not found' });
        }
    } catch (error) {
        console.error('Error updating data:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

app.put('/v1/plan/:id', verifyToken, async (req, res) => {
    const ajv = new Ajv();
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(req.body);
    const objectId = req.params.id;
    const requestBodyString = JSON.stringify(req.body);
    const ifMatchHeader = req.headers['if-match'];

    try {
        const dataString = await redisClient.get(objectId);
        if (dataString) {
            const currentEtag = etag(dataString);

            if (!ifMatchHeader || ifMatchHeader !== currentEtag) {
                return res.status(412).send({ message: 'Precondition failed - ETag mismatch' });
            }

            const dataExists = await redisClient.exists(objectId);

            if (dataExists) {
                await redisClient.set(objectId, requestBodyString);
                res.status(200).send({ message: 'Plan updated successfully' });
            } else {
                res.status(404).send({ message: 'Plan not found' });
            }
        } else {
            res.status(404).send({ message: 'Data not found' });
        }
    } catch (error) {
        console.error('Error updating data:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});



app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});