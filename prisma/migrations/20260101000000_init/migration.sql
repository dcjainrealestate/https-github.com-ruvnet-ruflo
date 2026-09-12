-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SALES_MEMBER', 'CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('SELLER', 'LESSOR');

-- CreateEnum
CREATE TYPE "FieldVisibilityMode" AS ENUM ('VISIBLE', 'MASKED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('ACTIVE', 'SOLD', 'EXPIRED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CONTRIBUTOR',
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSetupDeadline" TIMESTAMP(3) NOT NULL,
    "twoFactorTempSecret" TEXT,
    "canManageFieldVisibility" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldOption" (
    "id" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DependentFieldDefinition" (
    "id" TEXT NOT NULL,
    "parentFieldKey" TEXT NOT NULL,
    "childFieldKey" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DependentFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DependentFieldOption" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "parentValue" TEXT NOT NULL,
    "childValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DependentFieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldVisibilityRule" (
    "id" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "mode" "FieldVisibilityMode" NOT NULL DEFAULT 'VISIBLE',
    "createdById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldVisibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResaleInventory" (
    "id" TEXT NOT NULL,
    "propertyCategory" TEXT NOT NULL,
    "propertySubCategory" TEXT NOT NULL,
    "developerName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "microMarket" TEXT NOT NULL,
    "customerType" "CustomerType" NOT NULL,
    "customerName" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "alternateMobileNo" TEXT,
    "emailId" TEXT,
    "alternateEmailId" TEXT,
    "towerNameNo" TEXT NOT NULL,
    "flatNo" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "accommodation" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "facing" TEXT NOT NULL,
    "furnishingStatus" TEXT NOT NULL,
    "askingPrice" DOUBLE PRECISION,
    "expectedRent" DOUBLE PRECISION,
    "pricePerSqFt" DOUBLE PRECISION,
    "propertyAgeYears" DOUBLE PRECISION NOT NULL,
    "holdingDurationYears" DOUBLE PRECISION NOT NULL,
    "targetSaleTimeframeDays" INTEGER NOT NULL,
    "targetSaleDate" TIMESTAMP(3) NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastReminderSentAt" TIMESTAMP(3),
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResaleInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysRemaining" INTEGER NOT NULL,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "FieldOption_fieldKey_idx" ON "FieldOption"("fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "FieldOption_fieldKey_value_key" ON "FieldOption"("fieldKey", "value");

-- CreateIndex
CREATE UNIQUE INDEX "DependentFieldDefinition_parentFieldKey_childFieldKey_key" ON "DependentFieldDefinition"("parentFieldKey", "childFieldKey");

-- CreateIndex
CREATE INDEX "DependentFieldOption_definitionId_parentValue_idx" ON "DependentFieldOption"("definitionId", "parentValue");

-- CreateIndex
CREATE UNIQUE INDEX "DependentFieldOption_definitionId_parentValue_childValue_key" ON "DependentFieldOption"("definitionId", "parentValue", "childValue");

-- CreateIndex
CREATE UNIQUE INDEX "FieldVisibilityRule_fieldKey_role_key" ON "FieldVisibilityRule"("fieldKey", "role");

-- CreateIndex
CREATE INDEX "ResaleInventory_submittedById_idx" ON "ResaleInventory"("submittedById");

-- CreateIndex
CREATE INDEX "ResaleInventory_status_targetSaleDate_idx" ON "ResaleInventory"("status", "targetSaleDate");

-- AddForeignKey
ALTER TABLE "FieldOption" ADD CONSTRAINT "FieldOption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependentFieldDefinition" ADD CONSTRAINT "DependentFieldDefinition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependentFieldOption" ADD CONSTRAINT "DependentFieldOption_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "DependentFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVisibilityRule" ADD CONSTRAINT "FieldVisibilityRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleInventory" ADD CONSTRAINT "ResaleInventory_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "ResaleInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

