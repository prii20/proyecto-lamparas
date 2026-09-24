import connection from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { transporter } from "../config/mailer.js";
import crypto from "crypto";


export const register = (req, res) => {
  const { nombre, email, password, rol } = req.body;

  // Si no mandan rol, asigno "usuario"
  const userRol = rol === "admin" ? "admin" : "user";

  const hashedPassword = bcrypt.hashSync(password, 8);

  const sql = "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)";

  connection.query(sql, [nombre, email, hashedPassword, userRol], (err, result) => {
    if (err) {
      console.error("Error al registrar usuario:", err);
      return res.status(500).json({ message: "Error al registrar usuario", error: err });
    }
    res.json({ message: "Usuario registrado con éxito" });
  });
};

export const login = (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM usuarios WHERE email = ? AND activo = 1";

  connection.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Error al buscar usuario" });

    if (results.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = results[0];
    const passwordIsValid = bcrypt.compareSync(password, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol
      },
    });
  });
};

//  NUEVO: obtener datos del usuario logueado
export const obtenerUsuarioLogueado = (req, res) => {
  const userId = req.user.id;

  connection.query(
    "SELECT id, nombre, email, rol FROM usuarios WHERE id = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results[0]);
    }
  );
};



// AGREGADO DE ENVIO DE LINKS PARA CAMBIAR CONTRASEÑA

export const forgotPassword = (req, res) => {
  const { email } = req.body;

  const token = crypto.randomBytes(20).toString("hex");
  const expire = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  connection.query(
    "UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE email = ?",
    [token, expire, email],
    async (err, result) => {
      if (err) return res.status(500).json({ message: "Error servidor" });

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Email no encontrado" });
      }
      const link = `${process.env.FRONTEND_URL}/resetContra.html?token=${token}`;

      try {
        await transporter.sendMail({
         from: `Simulador Lámparas <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Recuperar contraseña",
          html: `
            <h2>Recuperar contraseña</h2>
            <p>Hacé click en el siguiente enlace:</p>
            <a href="${link}">${link}</a>
            <p>Este enlace vence en 15 minutos</p>
          `,
        });

        res.json({ message: "Correo enviado correctamente" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error enviando email" });
      }
    }
  );
};


// AGREGADO MODIFICADO DE CAMBIAR A UNA NUEVA CONTRASEÑA
export const resetPassword = (req, res) => {
  const { token, nuevaPassword } = req.body;

  if (!nuevaPassword || nuevaPassword.length < 6) {
    return res.status(400).json({ message: "Mínimo 6 caracteres" });
  }

  connection.query(
    "SELECT * FROM usuarios WHERE reset_token = ? AND reset_expires > NOW()",
    [token],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error servidor" });

      if (results.length === 0) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }

      const hashedPassword = bcrypt.hashSync(nuevaPassword, 8);

      connection.query(
        "UPDATE usuarios SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?",
        [hashedPassword, results[0].id],
        (err) => {
          if (err) return res.status(500).json({ message: "Error actualizando" });

          res.json({ message: "Contraseña actualizada correctamente" });
        }
      );
    }
  );
};



// NUEVO AGREGADO: LOGIN CON GOOGLE 
export const loginGoogle = (req, res) => {
  const { nombre, email } = req.body;

  const sql = "SELECT * FROM usuarios WHERE email = ?";

  connection.query(sql, [email], (err, results) => {

    if (results.length > 0) {
      const user = results[0];

      const token = jwt.sign(
        { id: user.id, rol: user.rol, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );

      return res.json({
        token,
        user: { id: user.id, nombre: user.nombre, rol: user.rol }
      });
    }

    // SI NO EXISTE → LO CREA
    const insert = "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, '', 'user')";

    connection.query(insert, [nombre, email], (err, result) => {

      const newUser = {
        id: result.insertId,
        nombre,
        rol: "user"
      };

      const token = jwt.sign(
        { id: newUser.id, rol: newUser.rol, email },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );

      res.json({ token, user: newUser });
    });
  });
};


