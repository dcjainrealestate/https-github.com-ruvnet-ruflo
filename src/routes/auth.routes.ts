import { Router } from 'express';
import {
  confirmTwoFactorSetup,
  forgotPassword,
  login,
  register,
  resetPassword,
  startTwoFactorSetup,
  verifyTwoFactorLogin,
} from '../controllers/auth.controller';
import { acceptTwoFactorSetupToken, requireAuthOrTwoFactorSetupToken } from '../middleware/twoFactorGate';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/2fa/verify-login', verifyTwoFactorLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/2fa/setup', acceptTwoFactorSetupToken, requireAuthOrTwoFactorSetupToken, startTwoFactorSetup);
router.post('/2fa/setup/confirm', acceptTwoFactorSetupToken, requireAuthOrTwoFactorSetupToken, confirmTwoFactorSetup);

export default router;
