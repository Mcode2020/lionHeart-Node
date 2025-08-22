import { Router, Request, Response } from 'express';

const router = Router();

// Basic test route
router.get('/test-basic', (req: Request, res: Response) => {
  res.json({ message: 'Basic test route working!' });
});

// Cart test route
router.get('/cart-test', (req: Request, res: Response) => {
  res.json({ message: 'Cart test route working!' });
});

export default router; 