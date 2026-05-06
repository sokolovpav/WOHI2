/*
  Warnings:

  - You are about to drop the column `solved` on the `questions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `questions` DROP COLUMN `solved`;

-- CreateTable
CREATE TABLE `solved_questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `questionId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `solvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `solved_questions_questionId_userId_key`(`questionId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `solved_questions` ADD CONSTRAINT `solved_questions_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solved_questions` ADD CONSTRAINT `solved_questions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
