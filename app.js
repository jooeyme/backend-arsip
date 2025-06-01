require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT;
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes/index.js");
const db = require('./models/index.js');
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

    db.sequelize
    .authenticate()
    .then(() => {
        console.log('Database connected successfully.');
    })
    .catch((err) => {
        console.error('Unable to connect to the database:', err);
    });

  
    app.use(express.json());
    app.use(morgan("dev"));
    app.use(cors());

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
