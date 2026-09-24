import express from "express";
import { obtenerDashboard } from "../controllers/dashboardController.js";
import { verificarToken, soloAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verificarToken, soloAdmin, obtenerDashboard);

export default router;