const mysql = require("mysql2/promise");

let db;

if (process.env.MYSQL_URL) {
  db = mysql.createPool(process.env.MYSQL_URL);
} else {
  db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "beehive",
    port: process.env.DB_PORT || 3306,
  });
}

module.exports = db;