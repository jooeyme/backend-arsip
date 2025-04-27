require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT;
const cors = require("cors");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const routes = require("./routes/index.js");
const db = require('./models/index.js');
const createIndex = require('./middleware/elasticsearch.js')

// createIndex().then(() => {
//     console.log("Elasticsearch indices initialized.");
//   });
  
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));


app.use("/api", routes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/api`);
});


// Test Database Connection
db.sequelize
    .authenticate()
    .then(() => {
        console.log('Database connected successfully.');
    })
    .catch((err) => {
        console.error('Unable to connect to the database:', err);
    });