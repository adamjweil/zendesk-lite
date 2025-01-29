import { Langfuse } from 'langfuse';

export const langfuse = new Langfuse({
  publicKey: import.meta.env.VITE_LANGFUSE_PUBLIC_KEY,
  secretKey: import.meta.env.VITE_LANGFUSE_SECRET_KEY,
  baseUrl: import.meta.env.VITE_LANGFUSE_BASE_URL
}); 