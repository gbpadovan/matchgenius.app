import { createClient } from '@/lib/supabase/server';
import { BlockKind } from '@/components/block';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
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

  if (document.user_id !== session.user.id) {
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

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
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
        user_id: session.user.id,
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

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
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

  if (document.user_id !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Delete document versions after timestamp
  await supabase
    .from('document_versions')
    .delete()
    .eq('document_id', id)
    .gt('created_at', new Date(timestamp).toISOString());

  return new Response('Deleted', { status: 200 });
}
