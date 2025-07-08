require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT;
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes/index.js");
const db = require('./models/index.js');
const helmet = require('helmet');
const createIndex = require('./middleware/elasticsearch.js');
const initIndices = require('./middleware/initEs.js');
const resetIndices = require('./middleware/initEs.js');

// createIndex().then(() => {
//     console.log("Elasticsearch indices initialized.");
//   });

// async function startServer() {
//   try {
//     // 1) Init Elasticsearch
//     await initIndices();
//     console.log("✅ Elasticsearch init selesai.");

// DAFTAR DOMAIN YANG DIIZINKAN (WHITE-LIST)
const whitelist = [
  'http://localhost:5173',    // React Dev Server
    // Domain produksi
  // tambahkan domain lain yang diperlukan
];

// Opsi CORS: hanya izinkan origin yang ada di whitelist
const corsOptions = {
  origin: function(origin, callback) {
    // Jika origin tidak terdefinisi (misal request via cURL), izinkan juga
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // Jika origin tidak ada di daftar, tolak request
    callback(new Error('CORS Policy: Origin tidak diizinkan'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],  // header apa saja yang boleh dikirim
  credentials: true, // jika mau sertakan cookie/authtoken dalam request
};


    db.sequelize
    .authenticate()
    .then(() => {
        console.log('Database connected successfully.');
    })
    .catch((err) => {
        console.error('Unable to connect to the database:', err);
    });

    // Optional: Konfigurasi CSP lebih ketat
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL, "ws:", "wss:"],
      frameAncestors: ["'none'"], // Mencegah clickjacking
    }
  }));

  // Optional: Cegah MIME sniffing
  app.use(helmet.noSniff());

  // Optional: Hide X-Powered-By header
  app.disable('x-powered-by');
    
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(cors(corsOptions));

  app.use(express.static('public'));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", routes);

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}/api`);
// });
module.exports = app;

// Test Database Connection

// } catch (err) {
//     console.error("❌ Startup failed:", err);
//     process.exit(1);
//   }
// }

// startServer();
