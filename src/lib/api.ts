interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    const response = await fetch(url, options);

    const contentType = response.headers.get('Content-Type') || '';
    const isApiRoute =
      url.includes('/rest/v1/') ||
      url.includes('/functions/v1/') ||
      url.includes('/storage/v1/');

    if (!response.ok && isApiRoute && !contentType.includes('text/html')) {
      const responseClone = response.clone();
      let errorData: unknown;
      try {
        errorData = await responseClone.json();
      } catch {
        errorData = await responseClone.text();
      }

      console.error(
        `API Fetch Error from ${response.url}: Status ${response.status}`,
        errorData
      );

      const errorMessage =
        typeof errorData === 'object' &&
        errorData !== null &&
        'message' in errorData &&
        typeof (errorData as Record<string, unknown>).message === 'string'
          ? (errorData as { message: string }).message
          : `Request failed with status ${response.status}`;

      const error = new Error(errorMessage) as ApiError;
      error.status = response.status;
      error.data = errorData;
      throw error;
    }
    return response;
  } catch (error) {
    const apiError = error as ApiError;
    if (!apiError.status) {
      console.error(`Network or unhandled fetch error for ${url}:`, error);
    }
    throw error;
  }
};

export default apiFetch;
