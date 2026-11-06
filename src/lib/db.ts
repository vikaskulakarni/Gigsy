import mysql from "mysql2/promise";
const globalForMysql = globalThis as typeof globalThis & { mysqlPool?: mysql.Pool };
const pool = globalForMysql.mysqlPool ?? mysql.createPool({host:process.env.DB_HOST||"localhost",port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||"root",password:process.env.DB_PASSWORD||"",database:process.env.DB_NAME||"gigsy",charset:"utf8mb4",waitForConnections:true,connectionLimit:10,queueLimit:0,decimalNumbers:true,dateStrings:true});
if(process.env.NODE_ENV!=="production") globalForMysql.mysqlPool=pool;
export default pool;
