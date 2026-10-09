import { prisma } from '../config/prisma';
import { BadRequestError } from '../utils/errors';
import { OptionBackedFieldKey } from '../constants/fieldKeys';

export async function assertValidOptionValue(fieldKey: OptionBackedFieldKey, value: string): Promise<void> {
  const option = await prisma.fieldOption.findUnique({
    where: { fieldKey_value: { fieldKey, value } },
  });
  if (!option || !option.isActive) {
    throw new BadRequestError(`"${value}" is not a configured value for ${fieldKey}`);
  }
}

// If an admin has configured parentFieldKey -> childFieldKey as a dependent
// pair, the child value must be one of the values mapped for the chosen
// parent value. If no such dependency has been configured, the child value
// is only checked against its own FieldOption list (handled separately).
export async function assertDependentValueAllowed(
  parentFieldKey: OptionBackedFieldKey,
  parentValue: string,
  childFieldKey: OptionBackedFieldKey,
  childValue: string,
): Promise<void> {
  const definition = await prisma.dependentFieldDefinition.findUnique({
    where: { parentFieldKey_childFieldKey: { parentFieldKey, childFieldKey } },
  });
  if (!definition) {
    return;
  }
  const mapping = await prisma.dependentFieldOption.findUnique({
    where: {
      definitionId_parentValue_childValue: {
        definitionId: definition.id,
        parentValue,
        childValue,
      },
    },
  });
  if (!mapping) {
    throw new BadRequestError(
      `"${childValue}" is not a valid ${childFieldKey} for ${parentFieldKey} "${parentValue}"`,
    );
  }
}
