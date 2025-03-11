CREATE TABLE IF NOT EXISTS "Price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"stripePriceId" varchar(100) NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"type" varchar NOT NULL,
	"interval" varchar,
	"intervalCount" json,
	"unitAmount" json,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Price_stripePriceId_unique" UNIQUE("stripePriceId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripeProductId" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Product_stripeProductId_unique" UNIQUE("stripeProductId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"status" varchar(50),
	"stripeCustomerId" varchar(100) NOT NULL,
	"stripeSubscriptionId" varchar(100),
	"stripePriceId" varchar(100),
	"stripeCurrentPeriodEnd" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Subscription_stripeSubscriptionId_unique" UNIQUE("stripeSubscriptionId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Price" ADD CONSTRAINT "Price_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
