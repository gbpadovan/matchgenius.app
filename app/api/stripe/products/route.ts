import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    return NextResponse.json(products.data);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Error fetching products' },
      { status: 500 }
    );
  }
} 