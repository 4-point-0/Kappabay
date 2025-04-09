/*
  Warnings:

  - You are about to drop the `Escrow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Locked` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Escrow";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Locked";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "prompts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "objectId" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "prompts_objectId_key" ON "prompts"("objectId");
