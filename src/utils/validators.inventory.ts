import { z } from 'zod';
import { CustomerType } from '@prisma/client';

const phoneRegex = /^[0-9+\- ]{7,20}$/;

export const createInventorySchema = z
  .object({
    propertyCategory: z.string().min(1),
    propertySubCategory: z.string().min(1),
    developerName: z.string().min(1),
    projectName: z.string().min(1),
    sector: z.string().min(1),
    microMarket: z.string().min(1),

    customerType: z.nativeEnum(CustomerType),
    customerName: z.string().min(1).max(200),
    mobileNo: z.string().regex(phoneRegex, 'Invalid mobile number'),
    alternateMobileNo: z.string().regex(phoneRegex, 'Invalid mobile number').optional(),
    emailId: z.string().email().optional(),
    alternateEmailId: z.string().email().optional(),

    towerNameNo: z.string().min(1),
    flatNo: z.string().min(1),
    floor: z.string().min(1),
    accommodation: z.string().min(1),
    area: z.number().positive(),
    facing: z.string().min(1),
    furnishingStatus: z.string().min(1),

    askingPrice: z.number().positive().optional(),
    expectedRent: z.number().positive().optional(),

    propertyAgeYears: z.number().min(0),
    holdingDurationYears: z.number().min(0),

    targetSaleTimeframeDays: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    if (data.customerType === 'SELLER' && data.askingPrice === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'askingPrice is required when customerType is SELLER',
        path: ['askingPrice'],
      });
    }
    if (data.customerType === 'LESSOR' && data.expectedRent === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'expectedRent is required when customerType is LESSOR',
        path: ['expectedRent'],
      });
    }
  });

export const updateInventorySchema = createInventorySchema.innerType().partial();

export const updateInventoryStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SOLD', 'EXPIRED', 'WITHDRAWN']),
});
