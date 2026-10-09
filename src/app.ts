import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import inventoryRoutes from './routes/inventory.routes';
import fieldOptionsRoutes from './routes/fieldOptions.routes';
import dependentFieldsRoutes from './routes/dependentFields.routes';
import fieldVisibilityRoutes from './routes/fieldVisibility.routes';
import auditLogRoutes from './routes/auditLog.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/inventory', inventoryRoutes);
  app.use('/field-options', fieldOptionsRoutes);
  app.use('/dependent-fields', dependentFieldsRoutes);
  app.use('/field-visibility-rules', fieldVisibilityRoutes);
  app.use('/audit-logs', auditLogRoutes);

  app.use(errorHandler);

  return app;
}
