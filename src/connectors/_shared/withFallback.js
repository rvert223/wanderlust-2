// Wraps a real API call with its mock. The mock runs when the connector is not configured
// (placeholder keys) OR when the real call fails — so the demo never breaks on stage.
//   export const visualSearch = withFallback('serpapi-lens', isReady, realFn, mockFn);
export const withFallback = (name, isReady, real, mock) => async (...args) => {
  if (!isReady()) return mock(...args);
  try {
    return await real(...args);
  } catch (error) {
    console.warn(`[${name}] real call failed, using mock`, error);
    return mock(...args);
  }
};
