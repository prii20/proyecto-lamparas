import connection from "../config/db.js";

//  Obtener todas las lámparas
export const getLamparas = (req, res) => {
const sql = "SELECT * FROM lamparas WHERE activo = 1";
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener lámparas", error: err });
    res.json(results);
  });
};

//  Obtener una lámpara por ID
export const getLamparaById = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM lamparas WHERE id = ? AND activo = 1";
  connection.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener lámpara", error: err });
    if (results.length === 0) return res.status(404).json({ message: "Lámpara no encontrada" });
    res.json(results[0]);
  });
};

//  Agregar nueva lámpara (solo admin)
export const addLampara = (req, res) => {
  const { nombre, descripcion, tipo, ruta_imagen, precio, stock } = req.body;

  const precioNum = Number(precio);
  const stockNum = Number(stock);

  //  VALIDACIÓN FUERTE
  if (!nombre || isNaN(precioNum) || isNaN(stockNum)) {
    return res.status(400).json({
      message: "Datos inválidos (precio o stock incorrectos)"
    });
  }

  const sql = `
    INSERT INTO lamparas 
    (nombre, descripcion, tipo, ruta_imagen, precio, stock, activo) 
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `;

  connection.query(sql, [
    nombre,
    descripcion,
    tipo,
    ruta_imagen,
    precioNum,
    stockNum
  ], (err, result) => {

    if (err) {
      console.error(" ERROR MYSQL:", err);
      return res.status(500).json({ message: "Error al agregar lámpara", error: err });
    }

    res.json({ message: "Lámpara agregada correctamente", id: result.insertId });
  });
};

//  Editar lámpara (solo admin)
export const updateLampara = (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, tipo, ruta_imagen,precio,stock } = req.body;
    console.log("BODY:", req.body);
  const sql = "UPDATE lamparas SET nombre=?, descripcion=?, tipo=?, ruta_imagen=?, precio=?,stock=? WHERE id=?";
  connection.query(sql, [ nombre, descripcion, tipo, ruta_imagen, precio, stock, id ], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al actualizar lámpara", error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Lámpara no encontrada" });
    res.json({ message: "Lámpara actualizada correctamente" });
  });
};

//  Eliminar lámpara (solo admin)
export const deleteLampara = (req, res) => {
  const { id } = req.params;

  const sql = `
    UPDATE lamparas 
    SET activo = 0, fecha_eliminado = NOW() 
    WHERE id = ?
  `;

  connection.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al eliminar", error: err });
     if (result.affectedRows === 0)
      return res.status(404).json({ message: "Lámpara no encontrada" });

    res.json({ message: "Lámpara enviada a papelera " });
  });
};

// NUEVO AGREGADO:  Ver lámparas eliminadas
export const getLamparasEliminadas = (req, res) => {
  const sql = "SELECT * FROM lamparas WHERE activo = 0  ORDER BY fecha_eliminado DESC  ";

  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Error", error: err });
    res.json(results);
  });
};

// NUEVO AGREGADO:  Restaurar lámpara

export const restaurarLampara = (req, res) => {
  const { id } = req.params;

  const sql = `
    UPDATE lamparas 
    SET activo = 1, fecha_eliminado = NULL 
    WHERE id = ?
  `;

  connection.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ message: "Error", error: err });
 res.json({ message: "Lámpara restaurada correctamente" });
  });
};