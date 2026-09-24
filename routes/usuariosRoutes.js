import express from "express";
import { getUsuarios, updateUsuario, deleteUsuario } from "../controllers/usuariosController.js";
import { verificarToken, soloAdmin } from "../middleware/authMiddleware.js";
import { getUsuariosEliminados, restaurarUsuario } from "../controllers/usuariosController.js";

const router = express.Router();

router.get("/", verificarToken, soloAdmin, getUsuarios);
router.put("/:id", verificarToken, soloAdmin, updateUsuario);
router.delete("/:id", verificarToken, soloAdmin, deleteUsuario);
// nueva rutas
router.get("/eliminados", verificarToken, soloAdmin, getUsuariosEliminados);
router.put("/restaurar/:id", verificarToken, soloAdmin, restaurarUsuario);

export default router;
