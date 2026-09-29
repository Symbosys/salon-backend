-- DropForeignKey
ALTER TABLE "Salon" DROP CONSTRAINT "Salon_ownerId_fkey";

-- AlterTable
ALTER TABLE "Salon" ALTER COLUMN "ownerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Salon" ADD CONSTRAINT "Salon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
