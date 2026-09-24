import express from "express";
import {
  getLamparas,
  getLamparaById,
  addLampara,
  updateLampara,
  deleteLampara,
} from "../controllers/lamparaController.js";

import { verificarToken, soloAdmin } from "../middleware/authMiddleware.js";
import { getLamparasEliminadas, restaurarLampara } from "../controllers/lamparaController.js";

const router = express.Router();




//  Listar lámparas (todos los usuarios)
router.get("/", getLamparas);
//lista para ver lamparas eliminadas
router.get("/eliminadas", verificarToken, soloAdmin, getLamparasEliminadas);

//  Ver una lámpara por ID
router.get("/:id", getLamparaById);

//  Crear nueva lámpara (solo admin)
router.post("/", verificarToken, soloAdmin, addLampara);

//  Actualizar lámpara (solo admin)
router.put("/:id", verificarToken, soloAdmin, updateLampara);
// Restaura las lamparas
router.put("/restaurar/:id", verificarToken, soloAdmin, restaurarLampara);

//  Eliminar lámpara (solo admin)
router.delete("/:id", verificarToken, soloAdmin, deleteLampara);

export default router;
