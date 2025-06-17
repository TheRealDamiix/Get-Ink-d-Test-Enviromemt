
const apiFetch = async (url, options = {}) => {
  try {
    const response = await window.fetch(url, options);
    
    const contentType = response.headers.get('Content-Type') || '';
    const isApiRoute = url.includes('/rest/v1/') || url.includes('/functions/v1/') || url.includes('/storage/v1/');


    if (!response.ok && isApiRoute && !contentType.includes('text/html')) {
      const responseClone = response.clone();
      let errorData;
      try {
        errorData = await responseClone.json(); 
      } catch (e) {
        errorData = await responseClone.text(); 
      }
      
      console.error(`API Fetch Error from ${response.url}: Status ${response.status}`, errorData);
      
      const error = new Error(errorData.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }
    return response;
  } catch (error) {
    if (!error.status) { 
      console.error(`Network or unhandled fetch error for ${url}:`, error);
    }
    throw error; 
  }
};

export default apiFetch;
