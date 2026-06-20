import { Router } from 'express';
import { getCoinData } from '../controllers/coinController';

const router = Router();

// Public route to fetch coin data for charts
router.get('/markets', getCoinData);

export default router;
