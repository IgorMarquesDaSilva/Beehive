const fs = require("fs");

require("dotenv").config({ quiet: true });

const SSL_QUERY_KEYS = new Set(["ssl", "ssl-mode", "sslmode"]);

function getDatabaseUrl() {
  return process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || "";
}

function parseBoolean(value) {
  if (value === undefined || value === null || value === "") return null;

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function getSslModeFromUrl(databaseUrl) {
  if (!databaseUrl) return "";

  try {
    const parsed = new URL(databaseUrl);

    return (
      parsed.searchParams.get("ssl-mode") ||
      parsed.searchParams.get("sslmode") ||
      parsed.searchParams.get("ssl") ||
      ""
    );
  } catch (_err) {
    return "";
  }
}

function getSslCa() {
  if (process.env.MYSQL_SSL_CA) {
    return process.env.MYSQL_SSL_CA.replace(/\\n/g, "\n");
  }

  if (process.env.MYSQL_SSL_CA_FILE) {
    return fs.readFileSync(process.env.MYSQL_SSL_CA_FILE, "utf8");
  }

  return null;
}

function buildSslOptions(databaseUrl) {
  const explicitSsl = parseBoolean(process.env.DB_SSL);
  const sslMode = String(process.env.DB_SSL_MODE || getSslModeFromUrl(databaseUrl)).toLowerCase();
  const ca = getSslCa();
  const shouldUseSsl =
    explicitSsl === true ||
    Boolean(ca) ||
    ["true", "1", "required", "require", "verify-ca", "verify_identity", "verify-identity"].includes(sslMode);

  if (!shouldUseSsl) return null;

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

  if (ca) {
    return { ca, rejectUnauthorized };
  }

  return { rejectUnauthorized };
}

function buildConfigFromUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const config = {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")) || process.env.DB_NAME || "beehive",
  };

  for (const [key, value] of parsed.searchParams.entries()) {
    if (!SSL_QUERY_KEYS.has(key.toLowerCase())) {
      config[key] = value;
    }
  }

  return config;
}

function buildConfigFromEnv() {
  return {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "beehive",
    port: Number(process.env.DB_PORT || 3306),
  };
}

function buildDbOptions(extraOptions = {}) {
  const databaseUrl = getDatabaseUrl();
  const config = databaseUrl ? buildConfigFromUrl(databaseUrl) : buildConfigFromEnv();
  const ssl = buildSslOptions(databaseUrl);

  if (ssl) {
    config.ssl = ssl;
  }

  return {
    ...config,
    ...extraOptions,
  };
}

module.exports = {
  buildDbOptions,
  getDatabaseUrl,
};
