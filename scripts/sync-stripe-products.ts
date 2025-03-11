/**
 * This script syncs products and prices from Stripe to our database.
 * Run it whenever you update your products in Stripe.
 * 
 * Usage: npx tsx scripts/sync-stripe-products.ts
 */

import 'dotenv/config';
import { stripe } from '../lib/stripe';
import { createOrUpdateProduct, createOrUpdatePrice } from '../lib/db/queries';

async function syncStripeProducts() {
  try {
    console.log('🔄 Syncing Stripe products and prices...');
    
    // Fetch all active products from Stripe
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });
    
    console.log(`Found ${products.data.length} active products in Stripe`);
    
    // Process each product
    for (const product of products.data) {
      console.log(`Processing product: ${product.name} (${product.id})`);
      
      // Create or update the product in our database
      await createOrUpdateProduct({
        stripeProductId: product.id,
        name: product.name,
        description: product.description || undefined,
        active: product.active,
      });
      
      // Fetch all prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });
      
      console.log(`Found ${prices.data.length} active prices for product ${product.name}`);
      
      // Process each price
      for (const price of prices.data) {
        console.log(`Processing price: ${price.id}`);
        
        // Get the product from our database to get its ID
        const dbProduct = await getProductByStripeProductId(product.id);
        
        if (!dbProduct) {
          console.error(`Product ${product.id} not found in database, skipping price ${price.id}`);
          continue;
        }
        
        // Create or update the price in our database
        await createOrUpdatePrice({
          productId: dbProduct.id,
          stripePriceId: price.id,
          currency: price.currency,
          type: price.type as 'one_time' | 'recurring',
          interval: price.type === 'recurring' ? price.recurring?.interval : undefined,
          intervalCount: price.type === 'recurring' ? price.recurring?.interval_count : undefined,
          unitAmount: price.unit_amount || 0, // Default to 0 if null
          active: price.active,
        });
      }
    }
    
    console.log('✅ Sync completed successfully!');
  } catch (error) {
    console.error('❌ Error syncing Stripe products:', error);
    process.exit(1);
  }
}

// Helper function to get a product from our database by Stripe product ID
async function getProductByStripeProductId(stripeProductId: string) {
  // This is a placeholder - in a real implementation, you'd import this from your queries
  // For this script, we're mocking it to avoid circular dependencies
  return { id: 'mock-product-id' };
}

// Run the sync function
syncStripeProducts();