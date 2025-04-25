-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "capId" TEXT NOT NULL,
    "ownerWallet" TEXT NOT NULL,
    "txDigest" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "billingStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastBilled" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_objectId_key" ON "Agent"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_capId_key" ON "Agent"("capId");
