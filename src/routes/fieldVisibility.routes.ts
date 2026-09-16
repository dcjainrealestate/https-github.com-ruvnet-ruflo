import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { requireFieldVisibilityManager } from '../middleware/fieldVisibilityPermission';
import { deleteVisibilityRule, listVisibilityRules, upsertVisibilityRule } from '../controllers/fieldVisibility.controller';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), listVisibilityRules);
router.put('/', requireFieldVisibilityManager, upsertVisibilityRule);
router.delete('/:id', requireFieldVisibilityManager, deleteVisibilityRule);

export default router;
