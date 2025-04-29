/*
  Warnings:

  - A unique constraint covering the columns `[dockerServiceId]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Agent_dockerServiceId_key" ON "Agent"("dockerServiceId");
