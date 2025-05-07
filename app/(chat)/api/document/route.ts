import { authenticateUser, createUnauthorizedResponse } from '@/lib/supabase/auth-helpers';
import { BlockKind } from '@/components/block';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  // Use the secure authentication helper
  const { authenticated, user, supabase, error } = await authenticateUser();
  
  if (!authenticated || !user) {
    console.error('Authentication error:', error);
    return createUnauthorizedResponse();
  }

  // Get documents by id
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id);

  const [document] = documents || [];

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.user_id !== user.id) { // Use user.id instead of session.user.id
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  // Use the secure authentication helper
  const { authenticated, user, supabase, error } = await authenticateUser();
  
  if (!authenticated || !user) {
    console.error('Authentication error:', error);
    return createUnauthorizedResponse();
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: BlockKind } = await request.json();

  // Check if document exists
  const { data: existingDocuments } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id);

  // Create or update document
  if (existingDocuments && existingDocuments.length > 0) {
    // Update existing document
    const { data: document } = await supabase
      .from('documents')
      .update({
        content,
        title,
        kind,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return Response.json(document, { status: 200 });
  } else {
    // Create new document
    const { data: document } = await supabase
      .from('documents')
      .insert({
        id,
        content,
        title,
        kind,
        user_id: user.id, // Use user.id instead of session.user.id
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    return Response.json(document, { status: 200 });
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  // Use the secure authentication helper
  const { authenticated, user, supabase, error } = await authenticateUser();
  
  if (!authenticated || !user) {
    console.error('Authentication error:', error);
    return createUnauthorizedResponse();
  }

  // Get document to check ownership
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id);

  const [document] = documents || [];

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.user_id !== user.id) { // Use user.id instead of session.user.id
    return new Response('Unauthorized', { status: 401 });
  }

  // Update document timestamp
  const { data: updatedDocument } = await supabase
    .from('documents')
    .update({
      updated_at: timestamp || new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  return Response.json(updatedDocument, { status: 200 });
}
