import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  timezone: '-03:00'
});

connection.connect((err) => {
  if (err) {
    console.error("Error conectando a MySQL:", err);
    console.error("Revisa Backend/.env o las credenciales de XAMPP. Ejemplo: DB_PASSWORD= (vacío) si root no tiene contraseña en XAMPP.");
  } else {
    console.log(" Conectado a la base de datos simulador_lamparas");
  }
});

export default connection;
