const DOMAIN = process.env.FRONTEND_DOMAIN ?? "localhost:8000";
const PROTOCOL = process.env.FRONTEND_PROTOCOL ?? "http";
const BASE_URL = `${PROTOCOL}://${DOMAIN}`;

module.exports = {
  DOMAIN,
  PROTOCOL,
  BASE_URL,
  buildUrl: (route) => BASE_URL + route,
};
