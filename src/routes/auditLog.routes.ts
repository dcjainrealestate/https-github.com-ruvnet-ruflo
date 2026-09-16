import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { listAuditLogs } from '../controllers/auditLog.controller';

const router = Router();

router.use(requireAuth);
router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), listAuditLogs);

export default router;
