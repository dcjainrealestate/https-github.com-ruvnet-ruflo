import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createInventory,
  deleteInventory,
  getInventoryById,
  listInventory,
  updateInventory,
  updateInventoryStatus,
} from '../controllers/inventory.controller';

const router = Router();

router.use(requireAuth);

// Any authenticated user (SUPER_ADMIN, ADMIN, SALES_MEMBER, CONTRIBUTOR) may
// post resale inventory, per requirement.
router.post('/', createInventory);
router.get('/', listInventory);
router.get('/:id', getInventoryById);
router.patch('/:id', updateInventory);
router.patch('/:id/status', updateInventoryStatus);
router.delete('/:id', deleteInventory);

export default router;
