import { APIRoute } from 'astro';

export const GET: APIRoute = ({ }) => {
  return new Response(JSON.stringify({ statusCode: 200, status: 'ok' }));
};
