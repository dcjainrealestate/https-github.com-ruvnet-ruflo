import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import {
  createDependentFieldDefinitionSchema,
  createDependentFieldOptionSchema,
} from '../utils/validators.fields';

export const listDependentFieldDefinitions = asyncHandler(async (_req: Request, res: Response) => {
  const definitions = await prisma.dependentFieldDefinition.findMany({
    select: { id: true, parentFieldKey: true, childFieldKey: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.status(200).json(definitions);
});

export const createDependentFieldDefinition = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const input = createDependentFieldDefinitionSchema.parse(req.body);

  const existing = await prisma.dependentFieldDefinition.findUnique({
    where: { parentFieldKey_childFieldKey: { parentFieldKey: input.parentFieldKey, childFieldKey: input.childFieldKey } },
  });
  if (existing) {
    throw new ConflictError('This parent/child field pairing already exists');
  }

  const definition = await prisma.dependentFieldDefinition.create({
    data: {
      parentFieldKey: input.parentFieldKey,
      childFieldKey: input.childFieldKey,
      createdById: req.user.sub,
    },
  });

  res.status(201).json(definition);
});

export const deleteDependentFieldDefinition = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const definition = await prisma.dependentFieldDefinition.findUnique({ where: { id } });
  if (!definition) {
    throw new NotFoundError('Dependent field definition not found');
  }
  await prisma.dependentFieldDefinition.delete({ where: { id } });
  res.status(204).send();
});

export const addDependentFieldOption = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const definition = await prisma.dependentFieldDefinition.findUnique({ where: { id } });
  if (!definition) {
    throw new NotFoundError('Dependent field definition not found');
  }
  const input = createDependentFieldOptionSchema.parse(req.body);

  const option = await prisma.dependentFieldOption.upsert({
    where: {
      definitionId_parentValue_childValue: {
        definitionId: id,
        parentValue: input.parentValue,
        childValue: input.childValue,
      },
    },
    update: {},
    create: { definitionId: id, parentValue: input.parentValue, childValue: input.childValue },
  });

  res.status(201).json(option);
});

export const removeDependentFieldOption = asyncHandler(async (req: Request, res: Response) => {
  const { optionId } = req.params;
  const option = await prisma.dependentFieldOption.findUnique({ where: { id: optionId } });
  if (!option) {
    throw new NotFoundError('Dependent field option not found');
  }
  await prisma.dependentFieldOption.delete({ where: { id: optionId } });
  res.status(204).send();
});

// Given a definition and a chosen parent value, returns the allowed child
// values - what actually drives the cascading dropdown on the client.
export const getChildValuesForParent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { parentValue } = req.query;

  const definition = await prisma.dependentFieldDefinition.findUnique({ where: { id } });
  if (!definition) {
    throw new NotFoundError('Dependent field definition not found');
  }

  const options = await prisma.dependentFieldOption.findMany({
    where: { definitionId: id, parentValue: typeof parentValue === 'string' ? parentValue : undefined },
    select: { childValue: true },
    orderBy: { childValue: 'asc' },
  });

  res.status(200).json(options.map((o) => o.childValue));
});
