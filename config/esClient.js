const { Client } = require("@elastic/elasticsearch");

// Konfigurasi Elasticsearch Client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "https://localhost:9200", // URL Elasticsearch
  auth: {
    username: process.env.ELASTIC_USERNAME || "elastic",
    password: process.env.ELASTIC_PASSWORD || "uvt89QmdU4JPE*W1cnwx",
  },
  tls: {
    rejectUnauthorized: false, // Abaikan verifikasi sertifikat self-signed
  },
});

module.exports = esClient;