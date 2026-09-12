import { Router } from 'express';
import {
  confirmTwoFactorSetup,
  login,
  register,
  startTwoFactorSetup,
  verifyTwoFactorLogin,
} from '../controllers/auth.controller';
import { acceptTwoFactorSetupToken, requireAuthOrTwoFactorSetupToken } from '../middleware/twoFactorGate';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/2fa/verify-login', verifyTwoFactorLogin);

router.post('/2fa/setup', acceptTwoFactorSetupToken, requireAuthOrTwoFactorSetupToken, startTwoFactorSetup);
router.post('/2fa/setup/confirm', acceptTwoFactorSetupToken, requireAuthOrTwoFactorSetupToken, confirmTwoFactorSetup);

export default router;
