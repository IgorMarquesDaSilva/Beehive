const mysql = require("mysql2/promise");
const { buildDbOptions } = require("./databaseOptions");

const db = mysql.createPool(buildDbOptions());

module.exports = db;
