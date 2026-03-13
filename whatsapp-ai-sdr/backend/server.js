require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // TODO: restrict in production
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const { connectDB } = require('./config/db');
const { initWhatsApp } = require('./services/whatsappService');

// Require models to setup relationships before sync
require('./models/Lead');
require('./models/Campaign');
require('./models/MessageLog');
require('./models/LeadCampaign');

// Connect to SQLite
connectDB();

// Initialize WhatsApp client with Socket.io
initWhatsApp(io);

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
