import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createPaymentSchema, updatePaymentSchema, createExemptionSchema } from './payment.schema';
import { listPayments, createPayment, updatePayment, addExemption } from './payment.controller';

const router = Router();
router.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);

router.get('/', listPayments);
router.post('/', validate(createPaymentSchema), createPayment);
router.patch('/:paymentId', validate(updatePaymentSchema), updatePayment);
router.post('/:paymentId/exemption', validate(createExemptionSchema), addExemption);

export default router;
