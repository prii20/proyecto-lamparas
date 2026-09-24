import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import lamparaRoutes from "./routes/lamparaRoutes.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";
import favoritosRoutes from "./routes/favoritosRoutes.js";
import comentariosRoutes from "./routes/comentariosRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import pagoRoutes from "./routes/pagoRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

dotenv.config();

const app = express(); //  PRIMERO SE CREA

//  necesario para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//   app
app.use(express.static(path.join(__dirname, "../fronted")));
console.log("RUTA BACKEND:", __dirname);


// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/lamparas", lamparaRoutes); 
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/favoritos", favoritosRoutes);
app.use('/api', aiRoutes);
app.use("/api/comentarios", comentariosRoutes);
app.use("/api", pagoRoutes); 
app.use("/api/dashboard", dashboardRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Servidor corriendo en puerto ${PORT}`));