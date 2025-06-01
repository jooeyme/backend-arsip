const { Client } = require("@elastic/elasticsearch");

// Konfigurasi Elasticsearch Client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL , // URL Elasticsearch
  auth: {
    username: process.env.ELASTIC_USERNAME ,
    password: process.env.ELASTIC_PASSWORD ,
  },
  tls: {
    rejectUnauthorized: false, // Abaikan verifikasi sertifikat self-signed
  },
});

module.exports = esClient;