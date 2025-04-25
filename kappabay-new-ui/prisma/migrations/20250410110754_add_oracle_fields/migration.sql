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
    "oraclePid" INTEGER
);
INSERT INTO "new_Agent" ("agentWalletAddress", "agentWalletKey", "billingStatus", "capId", "config", "createdAt", "id", "lastBilled", "name", "objectId", "ownerWallet", "pid", "port", "status", "txDigest", "updatedAt") SELECT "agentWalletAddress", "agentWalletKey", "billingStatus", "capId", "config", "createdAt", "id", "lastBilled", "name", "objectId", "ownerWallet", "pid", "port", "status", "txDigest", "updatedAt" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE UNIQUE INDEX "Agent_objectId_key" ON "Agent"("objectId");
CREATE UNIQUE INDEX "Agent_capId_key" ON "Agent"("capId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
