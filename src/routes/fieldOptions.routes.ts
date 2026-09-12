import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createFieldOption, deleteFieldOption, listFieldOptions } from '../controllers/fieldOptions.controller';

const router = Router();

router.use(requireAuth);

// Any authenticated user needs to read options to populate the inventory form.
router.get('/:fieldKey', listFieldOptions);

// Only SUPER_ADMIN / ADMIN may add or remove values, per requirement.
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), createFieldOption);
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), deleteFieldOption);

export default router;
