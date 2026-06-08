import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { dailyRoutes, dietRoutes, foodRoutes, progressRoutes, workoutRoutes } from './routes/index.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		limit: 100,
	})
);

app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.use('/api/workouts', workoutRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/foods', foodRoutes);

app.use(errorHandler);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
	console.log(`API listening on port ${port}`);
});
