import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import metricRoutes from './routes/metric.js';
import habitRoutes from './routes/habit.js';
import predictionRoutes from './routes/prediction.js';
import performanceRoutes from './routes/performance.js';
import commitmentPodRoutes from './routes/commitmentPodRoutes.js';
import witnessRoutes from './routes/witness.js';
import chatRoutes from './routes/Chat.js';
import discoveryRoutes from './routes/discovery.js';
import connectWithDB from './config/database.js';
import { initializeSocketHandlers } from './services/socketHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);


const app    = express();
const server = http.createServer(app);


export const io = new Server(server, {
    cors: {
        origin: '*',   
        methods: ['GET', 'POST'],
    },
});

initializeSocketHandlers(io);


app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
    console.log(`${req.method}, ${req.path}`);
    next();
});

app.get('/', (_req, res) => {
    res.send('<h1>Companion app — server running</h1>');
});

app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/metrics',        metricRoutes);
app.use('/api/habit',          habitRoutes);
app.use('/api/predictions',    predictionRoutes);
app.use('/api/performance',    performanceRoutes);
app.use('/api/commitmentPods', commitmentPodRoutes);
app.use('/api/witness',        witnessRoutes);
app.use('/api/chat',           chatRoutes);
app.use('/api/discovery',      discoveryRoutes);


const PORT = process.env.PORT || 3000;

connectWithDB();

server.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
});