import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    createdAt: req.user.created_at,
  });
});

export default router;