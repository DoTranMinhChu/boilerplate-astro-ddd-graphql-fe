import { MiddlewareHandler } from 'astro';
import { ENVIRONMENT, HOSTNAME_ADMIN } from 'astro:env/server';

// `context` and `next` are automatically typed
export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();
  const isDashboard = context.url.hostname.includes(HOSTNAME_ADMIN);
  context.locals.isDashboard = isDashboard;

  // if (isDashboard && !context.originPathname.startsWith('/dashboard')) {
  //   return context.redirect('/dashboard');
  // }

  if (ENVIRONMENT !== 'prod' || isDashboard) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
};
