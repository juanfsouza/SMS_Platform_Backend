/*
  Warnings:

  - A unique constraint covering the columns `[activationId]` on the table `SmsActivation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SmsActivation_activationId_key" ON "SmsActivation"("activationId");
