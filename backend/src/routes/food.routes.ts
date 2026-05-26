import { Router } from 'express';
import { getFoodDatabase } from '../controllers/foodDatabase.controller.js';

const router = Router();

router.get('/', getFoodDatabase);

export default router;
