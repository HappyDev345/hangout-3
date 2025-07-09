import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secret123';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = './data.json';
let availabilities = [];

// Load saved data on startup
if (fs.existsSync(DATA_FILE)) {
  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    availabilities = JSON.parse(fileContent);
    console.log('✅ Loaded availability data from file.');
  } catch (err) {
    console.error('❌ Error reading data file:', err);
  }
}

// Function to save data
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(availabilities, null, 2));
}

// Submit availability
app.post('/submit', (req, res) => {
  const { name, availability } = req.body;
  if (!name || !availability || !Array.isArray(availability)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const i = availabilities.findIndex(a => a.name === name);
  if (i >= 0) availabilities[i] = { name, availability };
  else availabilities.push({ name, availability });

  saveData();
  res.json({ message: 'Availability saved' });
});

// Get results with best times
app.get('/results', (req, res) => {
  if (availabilities.length === 0) {
    return res.json({ bestTimes: [], availabilities });
  }

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
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Wrong password' });
  }

  availabilities = [];
  saveData();
  res.json({ message: 'All availability reset' });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
