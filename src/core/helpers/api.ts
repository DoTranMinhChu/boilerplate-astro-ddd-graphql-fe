import { GraphQL } from '@core/api/graphql';
import { baseConfig } from '@core/components/config/BaseConfig';
import { toast } from '@core/components/toast/ToastProvider';

export const apiRequestWithToast = async <T>(
  fn: () => Promise<T>,
  {
    actionName,
    successMessage,
    failureMessage,
  }: {
    actionName?: string;
    successMessage?: string | ((res: T) => string);
    failureMessage?: string;
  },
) => {
  try {
    const res = await fn();
    if (successMessage) {
      if (typeof successMessage == 'string') {
        toast().success(successMessage);
      } else {
        toast().success(successMessage(res));
      }
    } else if (actionName) {
      toast().success(baseConfig().taskSuccessText(actionName));
    }
    return res;
  } catch (err: any) {
    if (failureMessage) {
      toast().danger(failureMessage, err.message);
    } else if (actionName) {
      toast().danger(baseConfig().taskFailureText(actionName), err.message);
    } else {
      toast().danger(err.message);
    }
    throw err;
  }
};

export const getBackendUrl = (path?: string) => {
  return path?.includes('://')
    ? path
    : `${GraphQL.backendUrl}${path ? `${path.startsWith('/') ? '' : '/'}${path}` : ''}`;
};

const apiFetch = async (url: string, init?: RequestInit | undefined) => {
  const res = await fetch(getBackendUrl(url), {
    credentials: 'include',
    ...init,
  });
  if (res.ok) {
    const contentType = res.headers.get('content-type');

    if (!contentType) throw new Error('Unsupported content type');

    if (contentType.includes('application/json')) {
      return res.json(); // Handle JSON data
    } else if (contentType.includes('text/plain')) {
      return res.text(); // Handle plain text data
    } else if (contentType.includes('application/octet-stream')) {
      return res.blob(); // Handle binary data
    } else {
      throw new Error('Unsupported content type');
    }
  } else {
    const error = await res.json();
    throw error;
  }
};
export const api = {
  get: async (url: string, init?: RequestInit | undefined) => {
    return await apiFetch(url, { method: 'get', ...init });
  },
  post: async (url: string, init?: RequestInit | undefined) => {
    return await apiFetch(url, { method: 'post', ...init });
  },
  put: async (url: string, init?: RequestInit | undefined) => {
    return await apiFetch(url, { method: 'put', ...init });
  },
  delete: async (url: string, init?: RequestInit | undefined) => {
    return await apiFetch(url, { method: 'delete', ...init });
  },
};
