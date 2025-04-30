'use server';

import { createClient } from '@/lib/supabase/server';

export async function getSuggestions({ documentId }: { documentId: string }) {
  const supabase = await createClient();
  const { data: suggestions } = await supabase
    .from('suggestions')
    .select('*')
    .eq('document_id', documentId);
  return suggestions ?? [];
}
