const axios = require('axios');
const ServiceError = require('./ServiceError');

/* ---------------------------------------------------------------
   Inter-service REST client.

   Every call to another microservice goes through here, so the rules
   for talking across the network live in one place:
     - the shared x-service-key proves the caller is a RentBook service
     - x-request-id is forwarded so one user action can be traced
       through the logs of both services
     - a timeout stops a slow service from hanging this one
     - read-only calls are retried once (cold starts, brief blips)
     - network failures become a clean 503, never a crash
   --------------------------------------------------------------- */

const RETRYABLE = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN']);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createServiceClient(serviceName, baseURLEnvVar) {
  // Read lazily so .env is always loaded before the first call.
  const http = () =>
    axios.create({
      baseURL: process.env[baseURLEnvVar],
      timeout: Number(process.env.SERVICE_TIMEOUT_MS) || 20000,
      headers: { 'x-service-key': process.env.SERVICE_KEY },
    });

  async function request({ method = 'get', url, data, params, requestId, retry = method === 'get' }) {
    if (!process.env[baseURLEnvVar]) {
      throw new ServiceError(503, `${serviceName} URL is not configured (${baseURLEnvVar}).`, 'SERVICE_NOT_CONFIGURED');
    }

    const attempts = retry ? 2 : 1;
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const started = Date.now();
      try {
        const res = await http().request({
          method,
          url,
          data,
          params,
          headers: requestId ? { 'x-request-id': requestId } : {},
        });
        console.log(`  -> [${requestId || '-'}] ${serviceName} ${method.toUpperCase()} ${url} = ${res.status} (${Date.now() - started}ms)`);
        return res.data;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        console.warn(`  -> [${requestId || '-'}] ${serviceName} ${method.toUpperCase()} ${url} = ${status || error.code} (${Date.now() - started}ms)`);

        // The other service answered with a client error: no point retrying.
        if (status && status < 500) break;
        if (attempt < attempts) await wait(800);
      }
    }

    // Translate what went wrong into something this service can respond with.
    const status = lastError.response?.status;
    if (status === 404) return null; // "not found" is an answer, not a failure
    if (status && status < 500) {
      throw new ServiceError(502, `${serviceName} rejected the request: ${lastError.response.data?.message || status}`, 'UPSTREAM_REJECTED');
    }
    if (status) {
      throw new ServiceError(502, `${serviceName} returned an error (${status}). Try again shortly.`, 'UPSTREAM_ERROR');
    }
    throw new ServiceError(
      503,
      `${serviceName} is unreachable right now (${lastError.code || 'no response'}). If it is on a free host it may be waking up, so try again in a minute.`,
      'UPSTREAM_UNAVAILABLE'
    );
  }

  return { request };
}

module.exports = { createServiceClient };
