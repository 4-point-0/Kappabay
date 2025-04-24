/*
  Warnings:

  - A unique constraint covering the columns `[latestBlobHash]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Agent_latestBlobHash_key" ON "Agent"("latestBlobHash");
