
import connection from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
// ==========================================
// CONTROLLER: GESTIÓN DE COMENTARIOS
// ==========================================

//  1. OBTENER COMENTARIOS PÚBLICOS (Para el Frontend general)
export const obtenerComentarios = (req, res) => {
  const sql = `
    SELECT 
      c.id,
      c.comentario,
      c.fecha,
      c.usuario_id,
      u.id AS usuario_encontrado,
      u.nombre AS usuario
    FROM comentarios c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    WHERE c.activo = 1
    ORDER BY c.fecha DESC
    LIMIT 10   --  Esto hace que MySQL solo procese y envíe las 10 últimas filas
  `;

  connection.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
};

// 🔹 2. OBTENER COMENTARIOS ADMIN (Con filtros dinámicos de Top 10 y Fechas)
export const obtenerComentariosAdmin = (req, res) => {
  // Capturamos los parámetros que viajan opcionalmente por la URL (?limit=10 o ?desde=...&hasta=...)
  const { limit, desde, hasta } = req.query;

  let sql = `
    SELECT 
      c.id,
      c.comentario,
      c.fecha,
      c.activo, 
      u.nombre AS usuario,
      l.nombre AS lampara_nombre
    FROM comentarios c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    LEFT JOIN lamparas l ON l.id = c.lamparas_id
  `;

  // Array para ir guardando los valores de forma segura contra Inyección SQL
  const parametrosQuery = [];
  let condiciones = [];

  // Si vienen filtros de fecha, los sumamos al WHERE
  if (desde && hasta) {
    // Usamos DATE(c.fecha) por si en la base de datos guardás con horas (DATETIME/TIMESTAMP)
    condiciones.push("DATE(c.fecha) BETWEEN ? AND ?");
    parametrosQuery.push(desde, hasta);
  }

  // Si hay condiciones acumuladas, las pegamos al SQL
  if (condiciones.length > 0) {
    sql += " WHERE " + condiciones.join(" AND ");
  }

  // Siempre ordenamos por lo más nuevo primero
  sql += " ORDER BY c.fecha DESC";

  // Si el frontend pidió un tope (como el Top 10), se lo aplicamos de forma segura
  if (limit && !isNaN(limit)) {
    sql += " LIMIT ?";
    parametrosQuery.push(parseInt(limit));
  }

  // Ejecutamos la query final armada a medida
  connection.query(sql, parametrosQuery, (err, result) => {
    if (err) {
      console.error("Error al filtrar comentarios:", err);
      return res.status(500).json({ error: err });
    }
    res.json(result);
  });
};


//  CREAR COMENTARIO (Validación estricta con Historial de Pedidos Pagados)
export const crearComentario = (req, res) => {
  let { usuario_id, lamparas_id, comentario } = req.body;

  // 1. Validaciones básicas de campos vacíos
  if (!usuario_id || !comentario || comentario.trim() === "") {
    return res.status(400).json({ message: "Faltan campos obligatorios." });
  }

  let sqlVerificarCompra = "";
  let parametrosQuery = [];

  // 2. BIEN CONFIGURADO: Elegimos la query según si viene o no un ID de lámpara
  if (lamparas_id !== undefined && lamparas_id !== null && lamparas_id !== "") {
    // Si opina sobre una lámpara específica, cruzamos las tablas
    sqlVerificarCompra = `
      SELECT COUNT(*) AS total 
      FROM pedidos p
      JOIN detalle_pedido dp ON p.id = dp.pedido_id
      WHERE p.usuario_id = ? AND dp.lampara_id = ? AND p.estado_pago = 'pagado'
    `;
    parametrosQuery = [usuario_id, lamparas_id];
  } else {
    // 🌟 COMENTARIO GENERAL: Solo revisamos que el usuario tenga un pedido pagado
    sqlVerificarCompra = `
      SELECT COUNT(*) AS total 
      FROM pedidos p
      WHERE p.usuario_id = ? AND p.estado_pago = 'pagado'
    `;
    parametrosQuery = [usuario_id];
    lamparas_id = null; // Nos aseguramos de guardarlo como NULL en la DB
  }

  // 3. Ejecutamos la validación en MySQL
  connection.query(sqlVerificarCompra, parametrosQuery, (err, rows) => {
    if (err) {
      console.error("❌ Error en la query de verificación:", err);
      return res.status(500).json({ error: "Error interno del servidor al verificar la compra." });
    }

    const haComprado = rows[0].total > 0;

    if (!haComprado) {
      return res.status(403).json({ 
        message: "Acceso denegado. Necesitás registrar al menos una compra pagada en nuestra tienda para comentar."
      });
    }

    // 4. Si pasó la validación (total > 0), insertamos el comentario
    const sqlInsertar = `
      INSERT INTO comentarios (usuario_id, lamparas_id, comentario)
      VALUES (?, ?, ?)
    `;

    connection.query(sqlInsertar, [usuario_id, lamparas_id, comentario], (errInsert) => {
      if (errInsert) {
        console.error("❌ Error al insertar comentario:", errInsert);
        return res.status(500).json({ error: "No se pudo guardar tu comentario." });
      }
      
      res.json({ message: "¡Comentario agregado correctamente!" });
    });
  });
};

//  4. ALTERNAR ESTADO (Ocultar / Mostrar de forma lógica)
export const alternarEstadoComentario = (req, res) => {
  const { id } = req.params;
  const { activo } = req.body; 

// Si viene como número (0 o 1) lo usa, si viene como booleano lo convierte
const estadoMysql = (activo === 1 || activo === true) ? 1 : 0;

  const sql = "UPDATE comentarios SET activo = ? WHERE id = ?";

  connection.query(sql, [estadoMysql, id], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Comentario no encontrado" });
    }

    res.json({ message: "Estado del comentario actualizado con éxito" });
  });
};