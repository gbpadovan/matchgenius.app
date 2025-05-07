import { authenticateUser, createUnauthorizedResponse } from '@/lib/supabase/auth-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return new Response('Not Found', { status: 404 });
  }

  // Use the secure authentication helper
  const { authenticated, user, supabase, error } = await authenticateUser();
  
  if (!authenticated || !user) {
    console.error('Authentication error:', error);
    return createUnauthorizedResponse();
  }

  // Get suggestions for the document
  const { data: suggestions } = await supabase
    .from('suggestions')
    .select('*')
    .eq('document_id', documentId);

  const [suggestion] = suggestions || [];

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  if (suggestion.userId !== user.id) { // Use user.id instead of session.user.id
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json(suggestions, { status: 200 });
}
