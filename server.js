import express from 'express';
import path from 'path';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secret123';
const MONGO_URI = 'mongodb+srv://gamingbrothers337:5r6VmyqZgIcspJUx@cluster4.abbtlhi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster4';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db, collection;

MongoClient.connect(MONGO_URI)
  .then(client => {
    db = client.db('scheduler');
    collection = db.collection('availabilities');
    console.log('✅ Connected to MongoDB');
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Submit availability
app.post('/submit', async (req, res) => {
  const { name, availability } = req.body;
  if (!name || !Array.isArray(availability)) return res.status(400).json({ error: 'Invalid input' });

  await collection.updateOne(
    { name },
    { $set: { name, availability } },
    { upsert: true }
  );

  res.json({ message: 'Availability saved' });
});

// Get results
app.get('/results', async (req, res) => {
  const all = await collection.find().toArray();
  if (all.length === 0) return res.json({ bestTimes: [], availabilities: [] });

  const counts = {};
  all.forEach(({ availability }) => {
    availability.forEach(slot => counts[slot] = (counts[slot] || 0) + 1);
  });

  const sortedTimes = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const bestTimes = sortedTimes.map(([slot, count]) => ({ slot, count }));

  res.json({ bestTimes, availabilities: all });
});

// Reset
app.post('/reset', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Wrong password' });

  await collection.deleteMany({});
  res.json({ message: 'All availability reset' });
});

// ✅ Health check route (must come BEFORE wildcard route)
app.get('/health', async (req, res) => {
  try {
    const count = await collection.countDocuments();
    res.json({ status: 'ok', dbConnected: true, userCount: count });
  } catch (err) {
    res.status(500).json({ status: 'error', dbConnected: false });
  }
});

// Wildcard route (put LAST)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
