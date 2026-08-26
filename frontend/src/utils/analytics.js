export const trackEvent = (eventName, payload = {}) => {
  const eventPayload = {
    event: eventName,
    ...payload,
    timestamp: new Date().toISOString(),
  };

  if (window?.dataLayer && Array.isArray(window.dataLayer)) {
    window.dataLayer.push(eventPayload);
  }

  if (process.env.NODE_ENV !== 'production') {
    // Keep analytics lightweight in development.
    // eslint-disable-next-line no-console
    console.info('[analytics]', eventName, payload);
  }
};
