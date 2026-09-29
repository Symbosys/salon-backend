/*
  Warnings:

  - You are about to drop the column `isDeleted` on the `Category` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "isDeleted";

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
