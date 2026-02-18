const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = 12000,
  retries = 0,
  retryDelayMs = 400
) => {
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } catch (error) {
      lastError = error;
      if (error?.name === "AbortError") {
        lastError = new Error(`Request timed out after ${timeoutMs}ms`);
      }
    } finally {
      clearTimeout(timer);
    }

    attempt += 1;
    if (attempt <= retries) {
      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError || new Error("Request failed");
};
