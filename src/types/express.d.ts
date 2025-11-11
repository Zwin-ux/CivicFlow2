/**
 * Express type extensions
 * Extends Express Request interface with custom properties
 */

import { TokenPayload } from '../models/user';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
