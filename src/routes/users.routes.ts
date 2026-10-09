import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  listUsers,
  updateFieldVisibilityRights,
  updateUserRole,
  updateUserStatus,
} from '../controllers/users.controller';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), listUsers);
router.patch('/:id/role', requireRole('SUPER_ADMIN'), updateUserRole);
router.patch('/:id/field-visibility-rights', requireRole('SUPER_ADMIN'), updateFieldVisibilityRights);
router.patch('/:id/status', requireRole('SUPER_ADMIN'), updateUserStatus);

export default router;
