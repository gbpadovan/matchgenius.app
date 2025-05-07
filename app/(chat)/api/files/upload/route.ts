import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateUser, createUnauthorizedResponse } from '@/lib/supabase/auth-helpers';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ['image/jpeg', 'image/png'].includes(file.type), {
      message: 'File type should be JPEG or PNG',
    }),
});

export async function POST(request: Request) {
  // Use the secure authentication helper
  const { authenticated, user, supabase, error } = await authenticateUser();
  
  if (!authenticated || !user) {
    console.error('Authentication error:', error);
    return createUnauthorizedResponse();
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    });

    // You can save the blob URL to your database here
    // For example:
    // await supabase.from('files').insert({
    //   url: blob.url,
    //   user_id: user.id, // Use user.id instead of session.user.id
    //   created_at: new Date().toISOString(),
    // });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
}
