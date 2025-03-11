-- Create Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "status" VARCHAR(50),
  "stripeCustomerId" VARCHAR(100) NOT NULL,
  "stripeSubscriptionId" VARCHAR(100) UNIQUE,
  "stripePriceId" VARCHAR(100),
  "stripeCurrentPeriodEnd" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Product table
CREATE TABLE IF NOT EXISTS "Product" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "stripeProductId" VARCHAR(100) NOT NULL UNIQUE,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Price table
CREATE TABLE IF NOT EXISTS "Price" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "stripePriceId" VARCHAR(100) NOT NULL UNIQUE,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
  "type" VARCHAR(50) NOT NULL,
  "interval" VARCHAR(50),
  "intervalCount" JSONB,
  "unitAmount" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "price_productId_idx" ON "Price"("productId");