import { DataStreamWriter, tool } from 'ai';
import { Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { getDocumentsById, saveDocument } from '@/lib/supabase/db';
import { documentHandlersByBlockKind } from '@/lib/blocks/server';

interface UpdateDocumentProps {
  session: Session;
  dataStream: DataStreamWriter;
}

export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  tool({
    description: 'Update a document with the given description.',
    parameters: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }) => {
      // Get the document
      const { data, error } = await getDocumentsById({ id });
      const document = data?.[0];

      if (error || !document) {
        return {
          success: false,
          error: error?.message || 'Document not found',
        };
      }

      try {
        // Get the block handler for this document kind
        const handler = documentHandlersByBlockKind[document.kind];

        if (!handler) {
          return {
            success: false,
            error: `No handler found for document kind: ${document.kind}`,
          };
        }

        // Update the document with the handler
        const updatedContent = await handler.update({
          document,
          description,
          session,
          dataStream,
        });

        // Save the updated document
        await saveDocument({
          id: document.id,
          title: document.title,
          kind: document.kind,
          content: updatedContent,
          userId: session.user.id,
        });

        return { success: true };
      } catch (error) {
        console.error('Error updating document:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
