-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DataKind" AS ENUM ('FICTIONAL', 'HISTORICAL');

-- CreateTable
CREATE TABLE "SaveGame" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "saveVersion" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaveGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceParty" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "ideology" JSONB NOT NULL,
    "kind" "DataKind" NOT NULL DEFAULT 'FICTIONAL',
    "source" TEXT,
    "sourceDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferencePolitician" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partyId" TEXT,
    "attributes" JSONB,
    "kind" "DataKind" NOT NULL DEFAULT 'FICTIONAL',
    "source" TEXT,
    "sourceDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferencePolitician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceElectionResult" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "office" TEXT NOT NULL,
    "stateId" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "results" JSONB NOT NULL,
    "kind" "DataKind" NOT NULL DEFAULT 'HISTORICAL',
    "source" TEXT NOT NULL,
    "sourceDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceElectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaveGame_slotId_key" ON "SaveGame"("slotId");

-- CreateIndex
CREATE INDEX "SaveGame_updatedAt_idx" ON "SaveGame"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceParty_code_key" ON "ReferenceParty"("code");

-- CreateIndex
CREATE INDEX "ReferenceElectionResult_year_office_idx" ON "ReferenceElectionResult"("year", "office");

-- AddForeignKey
ALTER TABLE "ReferencePolitician" ADD CONSTRAINT "ReferencePolitician_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "ReferenceParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

