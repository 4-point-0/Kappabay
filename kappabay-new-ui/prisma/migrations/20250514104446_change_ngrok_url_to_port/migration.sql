/*
  Warnings:

  - You are about to alter the column `ngrokPort` on the `Agent` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
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
    "lastBilled" DATETIME,
    "agentWalletAddress" TEXT,
    "agentWalletKey" TEXT,
    "port" INTEGER,
    "pid" INTEGER,
    "hasOracle" BOOLEAN NOT NULL DEFAULT false,
    "oraclePort" INTEGER,
    "oraclePid" INTEGER,
    "dockerServiceId" TEXT,
    "terminalPort" INTEGER,
    "ngrokPort" INTEGER,
    "latestBlobHash" TEXT,
    "agentType" TEXT
);
INSERT INTO "new_Agent" ("agentType", "agentWalletAddress", "agentWalletKey", "billingStatus", "capId", "config", "createdAt", "dockerServiceId", "hasOracle", "id", "lastBilled", "latestBlobHash", "name", "ngrokPort", "objectId", "oraclePid", "oraclePort", "ownerWallet", "pid", "port", "status", "terminalPort", "txDigest", "updatedAt") SELECT "agentType", "agentWalletAddress", "agentWalletKey", "billingStatus", "capId", "config", "createdAt", "dockerServiceId", "hasOracle", "id", "lastBilled", "latestBlobHash", "name", "ngrokPort", "objectId", "oraclePid", "oraclePort", "ownerWallet", "pid", "port", "status", "terminalPort", "txDigest", "updatedAt" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE UNIQUE INDEX "Agent_objectId_key" ON "Agent"("objectId");
CREATE UNIQUE INDEX "Agent_capId_key" ON "Agent"("capId");
CREATE UNIQUE INDEX "Agent_dockerServiceId_key" ON "Agent"("dockerServiceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
