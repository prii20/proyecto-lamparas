import express from "express";
import { toggleFavorito, getFavoritos,deleteFavorito } from "../controllers/favoritosController.js";
import { verificarToken } from "../middleware/authMiddleware.js";



const router = express.Router();

router.post("/",verificarToken, toggleFavorito);
router.get("/",verificarToken, getFavoritos);
router.delete("/:id",verificarToken, deleteFavorito);

export default router;
