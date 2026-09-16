-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'SALES_MEMBER', 'CONTRIBUTOR') NOT NULL DEFAULT 'CONTRIBUTOR',
    `twoFactorSecret` VARCHAR(191) NULL,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorSetupDeadline` DATETIME(3) NOT NULL,
    `twoFactorTempSecret` VARCHAR(191) NULL,
    `canManageFieldVisibility` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `AuditLog_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
    INDEX `PasswordResetToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FieldOption` (
    `id` VARCHAR(191) NOT NULL,
    `fieldKey` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FieldOption_fieldKey_idx`(`fieldKey`),
    UNIQUE INDEX `FieldOption_fieldKey_value_key`(`fieldKey`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DependentFieldDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `parentFieldKey` VARCHAR(191) NOT NULL,
    `childFieldKey` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DependentFieldDefinition_parentFieldKey_childFieldKey_key`(`parentFieldKey`, `childFieldKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DependentFieldOption` (
    `id` VARCHAR(191) NOT NULL,
    `definitionId` VARCHAR(191) NOT NULL,
    `parentValue` VARCHAR(191) NOT NULL,
    `childValue` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DependentFieldOption_definitionId_parentValue_idx`(`definitionId`, `parentValue`),
    UNIQUE INDEX `DependentFieldOption_definitionId_parentValue_childValue_key`(`definitionId`, `parentValue`, `childValue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FieldVisibilityRule` (
    `id` VARCHAR(191) NOT NULL,
    `fieldKey` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'SALES_MEMBER', 'CONTRIBUTOR') NOT NULL,
    `mode` ENUM('VISIBLE', 'MASKED', 'HIDDEN') NOT NULL DEFAULT 'VISIBLE',
    `createdById` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FieldVisibilityRule_fieldKey_role_key`(`fieldKey`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResaleInventory` (
    `id` VARCHAR(191) NOT NULL,
    `propertyCategory` VARCHAR(191) NOT NULL,
    `propertySubCategory` VARCHAR(191) NOT NULL,
    `developerName` VARCHAR(191) NOT NULL,
    `projectName` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NOT NULL,
    `microMarket` VARCHAR(191) NOT NULL,
    `customerType` ENUM('SELLER', 'LESSOR') NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `mobileNo` VARCHAR(191) NOT NULL,
    `alternateMobileNo` VARCHAR(191) NULL,
    `emailId` VARCHAR(191) NULL,
    `alternateEmailId` VARCHAR(191) NULL,
    `towerNameNo` VARCHAR(191) NOT NULL,
    `flatNo` VARCHAR(191) NOT NULL,
    `floor` VARCHAR(191) NOT NULL,
    `accommodation` VARCHAR(191) NOT NULL,
    `area` DOUBLE NOT NULL,
    `facing` VARCHAR(191) NOT NULL,
    `furnishingStatus` VARCHAR(191) NOT NULL,
    `askingPrice` DOUBLE NULL,
    `expectedRent` DOUBLE NULL,
    `pricePerSqFt` DOUBLE NULL,
    `propertyAgeYears` DOUBLE NOT NULL,
    `holdingDurationYears` DOUBLE NOT NULL,
    `targetSaleTimeframeDays` INTEGER NOT NULL,
    `targetSaleDate` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'SOLD', 'EXPIRED', 'WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
    `lastReminderSentAt` DATETIME(3) NULL,
    `submittedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ResaleInventory_submittedById_idx`(`submittedById`),
    INDEX `ResaleInventory_status_targetSaleDate_idx`(`status`, `targetSaleDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReminderLog` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `daysRemaining` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FieldOption` ADD CONSTRAINT `FieldOption_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DependentFieldDefinition` ADD CONSTRAINT `DependentFieldDefinition_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DependentFieldOption` ADD CONSTRAINT `DependentFieldOption_definitionId_fkey` FOREIGN KEY (`definitionId`) REFERENCES `DependentFieldDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FieldVisibilityRule` ADD CONSTRAINT `FieldVisibilityRule_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResaleInventory` ADD CONSTRAINT `ResaleInventory_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReminderLog` ADD CONSTRAINT `ReminderLog_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `ResaleInventory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReminderLog` ADD CONSTRAINT `ReminderLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
