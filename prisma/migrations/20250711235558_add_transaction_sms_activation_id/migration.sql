-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "description" TEXT,
ADD COLUMN     "smsActivationId" INTEGER;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_smsActivationId_fkey" FOREIGN KEY ("smsActivationId") REFERENCES "SmsActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
