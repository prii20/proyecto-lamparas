import express from "express"; 
import {
  crearComentario,
  obtenerComentarios,
  obtenerComentariosAdmin,
  alternarEstadoComentario 
} from "../controllers/comentariosController.js";

import { verificarToken, soloAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

//  PUBLICO (frontend)
router.get("/", obtenerComentarios);

//  CREAR (requiere login)
router.post("/", verificarToken, crearComentario);

//  ADMIN
router.get("/admin", verificarToken, soloAdmin, obtenerComentariosAdmin);

router.put("/admin/:id/estado", verificarToken, soloAdmin, alternarEstadoComentario);

export default router;

