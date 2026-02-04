-- CreateTable
CREATE TABLE "prompts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "promptId" TEXT NOT NULL,
    "initialContext" TEXT,
    "memory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "test_cases_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testCaseId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "userInput" TEXT,
    "message" TEXT,
    "input" TEXT,
    "expectedBehavior" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "test_steps_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testCaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mocks_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testCaseId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "judgeModel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "test_executions_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "step_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "userInput" TEXT NOT NULL,
    "actualResponse" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "step_results_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "test_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "prompts_name_key" ON "prompts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mocks_testCaseId_name_key" ON "mocks"("testCaseId", "name");
