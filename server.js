import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const writeStream = fs.createWriteStream('data.csv');

const app = express();
const port = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secret123';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let availabilities = []; // In-memory storage: [{name, availability: [slots]}]

// Submit availability
app.post('/submit', (req, res) => {
  const { name, availability } = req.body;
  if (!name || !availability || !Array.isArray(availability)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  // Update or add
  const i = availabilities.findIndex(a => a.name === name);
  if (i >= 0) availabilities[i] = { name, availability };
  else availabilities.push({ name, availability }) && writeStream.write(`${name},${availability}\n`);
  res.json({ message: 'Availability saved' });
});

// Get results with best times
app.get('/results', (req, res) => {
  if (availabilities.length === 0) {
    return res.json({ bestTimes: [], availabilities });
  }
  // Count how many people available per slot
  const counts = {};
  availabilities.forEach(({ availability }) => {
    availability.forEach(slot => {
      counts[slot] = (counts[slot] || 0) + 1;
    });
  });
  const maxCount = Math.max(...Object.values(counts));
  const bestTimes = Object.entries(counts)
    .filter(([, c]) => c === maxCount)
    .map(([slot]) => slot);
  res.json({ bestTimes, availabilities });
});

// Reset all data (password protected)
app.post('/reset', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Wrong password' });
  availabilities = [];
  res.json({ message: 'All availability reset' });
});

// Serve index.html for all other routes (optional)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
