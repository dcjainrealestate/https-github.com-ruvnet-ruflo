import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  addDependentFieldOption,
  createDependentFieldDefinition,
  deleteDependentFieldDefinition,
  getChildValuesForParent,
  listDependentFieldDefinitions,
  removeDependentFieldOption,
} from '../controllers/dependentFields.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listDependentFieldDefinitions);
router.get('/:id/child-values', getChildValuesForParent);

// Only SUPER_ADMIN / ADMIN may create dependent (parent/child) field
// definitions and populate their values, per requirement.
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), createDependentFieldDefinition);
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), deleteDependentFieldDefinition);
router.post('/:id/options', requireRole('SUPER_ADMIN', 'ADMIN'), addDependentFieldOption);
router.delete('/:id/options/:optionId', requireRole('SUPER_ADMIN', 'ADMIN'), removeDependentFieldOption);

export default router;
