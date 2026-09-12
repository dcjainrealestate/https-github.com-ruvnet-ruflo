import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { createInventorySchema, updateInventorySchema, updateInventoryStatusSchema } from '../utils/validators.inventory';
import { assertDependentValueAllowed, assertValidOptionValue } from '../services/fieldOptionValidation';
import { computePricePerSqFt, computeTargetSaleDate } from '../services/inventoryCalculations';
import { applyFieldVisibility } from '../services/maskingService';
import { isAdminOrAbove } from '../middleware/rbac';

async function validateOptionBackedFields(data: {
  propertyCategory: string;
  propertySubCategory: string;
  developerName: string;
  projectName: string;
  sector: string;
  microMarket: string;
  accommodation: string;
  facing: string;
  furnishingStatus: string;
}): Promise<void> {
  await Promise.all([
    assertValidOptionValue('propertyCategory', data.propertyCategory),
    assertValidOptionValue('propertySubCategory', data.propertySubCategory),
    assertValidOptionValue('developerName', data.developerName),
    assertValidOptionValue('projectName', data.projectName),
    assertValidOptionValue('sector', data.sector),
    assertValidOptionValue('microMarket', data.microMarket),
    assertValidOptionValue('accommodation', data.accommodation),
    assertValidOptionValue('facing', data.facing),
    assertValidOptionValue('furnishingStatus', data.furnishingStatus),
  ]);

  // Cascading dependent-field checks (no-op if the pairing isn't configured).
  await Promise.all([
    assertDependentValueAllowed('developerName', data.developerName, 'projectName', data.projectName),
    assertDependentValueAllowed('microMarket', data.microMarket, 'sector', data.sector),
    assertDependentValueAllowed('propertyCategory', data.propertyCategory, 'propertySubCategory', data.propertySubCategory),
  ]);
}

export const createInventory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const input = createInventorySchema.parse(req.body);
  await validateOptionBackedFields(input);

  const pricePerSqFt = computePricePerSqFt(input.askingPrice, input.area);
  const targetSaleDate = computeTargetSaleDate(input.targetSaleTimeframeDays);

  const inventory = await prisma.resaleInventory.create({
    data: {
      ...input,
      pricePerSqFt,
      targetSaleDate,
      submittedById: req.user.sub,
    },
  });

  res.status(201).json(inventory);
});

async function getVisibilityRules(role: Role) {
  return prisma.fieldVisibilityRule.findMany({ where: { role } });
}

export const listInventory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const { status } = req.query;

  const where: Record<string, unknown> = {};
  if (typeof status === 'string') {
    where.status = status;
  }
  // Non-admin roles only see their own submissions; admins/super admins see all.
  if (!isAdminOrAbove(req.user.role)) {
    where.submittedById = req.user.sub;
  }

  const records = await prisma.resaleInventory.findMany({ where, orderBy: { createdAt: 'desc' } });
  const rules = await getVisibilityRules(req.user.role);

  const sanitized = records.map((record) =>
    applyFieldVisibility(record, req.user!.role, rules, { isOwner: record.submittedById === req.user!.sub }),
  );

  res.status(200).json(sanitized);
});

export const getInventoryById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const { id } = req.params;
  const record = await prisma.resaleInventory.findUnique({ where: { id } });
  if (!record) {
    throw new NotFoundError('Inventory record not found');
  }
  if (!isAdminOrAbove(req.user.role) && record.submittedById !== req.user.sub) {
    throw new ForbiddenError('You may only view your own inventory submissions');
  }

  const rules = await getVisibilityRules(req.user.role);
  const sanitized = applyFieldVisibility(record, req.user.role, rules, {
    isOwner: record.submittedById === req.user.sub,
  });

  res.status(200).json(sanitized);
});

export const updateInventory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const { id } = req.params;
  const record = await prisma.resaleInventory.findUnique({ where: { id } });
  if (!record) {
    throw new NotFoundError('Inventory record not found');
  }
  if (!isAdminOrAbove(req.user.role) && record.submittedById !== req.user.sub) {
    throw new ForbiddenError('You may only edit your own inventory submissions');
  }

  const input = updateInventorySchema.parse(req.body);
  const merged = { ...record, ...input };
  await validateOptionBackedFields(merged);

  const pricePerSqFt = computePricePerSqFt(merged.askingPrice ?? undefined, merged.area);
  const targetSaleDate = input.targetSaleTimeframeDays
    ? computeTargetSaleDate(input.targetSaleTimeframeDays)
    : undefined;

  const updated = await prisma.resaleInventory.update({
    where: { id },
    data: {
      ...input,
      pricePerSqFt,
      ...(targetSaleDate ? { targetSaleDate } : {}),
    },
  });

  res.status(200).json(updated);
});

export const updateInventoryStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const { id } = req.params;
  const record = await prisma.resaleInventory.findUnique({ where: { id } });
  if (!record) {
    throw new NotFoundError('Inventory record not found');
  }
  if (!isAdminOrAbove(req.user.role) && record.submittedById !== req.user.sub) {
    throw new ForbiddenError('You may only update your own inventory submissions');
  }

  const input = updateInventoryStatusSchema.parse(req.body);
  const updated = await prisma.resaleInventory.update({ where: { id }, data: { status: input.status } });
  res.status(200).json(updated);
});

export const deleteInventory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const { id } = req.params;
  const record = await prisma.resaleInventory.findUnique({ where: { id } });
  if (!record) {
    throw new NotFoundError('Inventory record not found');
  }
  if (!isAdminOrAbove(req.user.role) && record.submittedById !== req.user.sub) {
    throw new ForbiddenError('You may only delete your own inventory submissions');
  }

  await prisma.resaleInventory.delete({ where: { id } });
  res.status(204).send();
});
