import express from "express";
import { register, login,obtenerUsuarioLogueado } from "../controllers/authController.js";
import { verificarToken } from "../middleware/authMiddleware.js";  // nuevo agregado Importar el middleware
import { loginGoogle } from "../controllers/authController.js";
import { forgotPassword, resetPassword } from "../controllers/authController.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// router.post("/recuperar-password", recuperarPassword);
// router.post("/reset-password", resetPassword);


router.post("/google", loginGoogle);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);


router.get("/me", verificarToken, obtenerUsuarioLogueado); //  NUEVO: ruta para obtener datos del usuario logueado

export default router;
