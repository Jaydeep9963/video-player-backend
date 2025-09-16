// service-account-key.js
require("dotenv").config();

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

const envKeyString = process.env["GOOGLE_SERVICE_ACCOUNT_KEY"];

if (!envKeyString) {
  throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set");
}

const envKey: ServiceAccountKey = JSON.parse(envKeyString);

// Now you can use it with full type safety
const serviceAccount = {
  type: envKey.type,
  project_id: envKey.project_id,
  private_key_id: envKey.private_key_id,
  private_key: envKey.private_key,
  client_email: envKey.client_email,
  client_id: envKey.client_id,
  auth_uri: envKey.auth_uri,
  token_uri: envKey.token_uri,
  auth_provider_x509_cert_url: envKey.auth_provider_x509_cert_url,
  client_x509_cert_url: envKey.client_x509_cert_url,
  universe_domain: envKey.universe_domain,
};

export default serviceAccount;
