import { Router } from 'express';
import { query } from '../db.js';
import { toStatus } from '../mappers.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT id, name FROM statuses ORDER BY id ASC');
    res.json({ data: rows.map(toStatus) });
  } catch (error) {
    next(error);
  }
});

export default router;
