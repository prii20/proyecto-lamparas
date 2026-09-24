import connection from "../config/db.js";

export const toggleFavorito = (req, res) => {
  const usuarioId = req.user.id;
  const { lampara_id } = req.body;

  if (!usuarioId) return res.status(401).json({ msg: "No estás logueado" });

  const checkQuery = "SELECT * FROM favoritos WHERE usuario_id = ? AND lampara_id = ?";
  connection.query(checkQuery, [usuarioId, lampara_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ msg: "Error del servidor" });
    }

    if (results.length > 0) {
      const deleteQuery = "DELETE FROM favoritos WHERE usuario_id = ? AND lampara_id = ?";
      connection.query(deleteQuery, [usuarioId, lampara_id], (err2) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ msg: "Error del servidor" });
        }
        return res.json({ agregado: false });
      });
    } else {
      const insertQuery = "INSERT INTO favoritos (usuario_id, lampara_id) VALUES (?, ?)";
      connection.query(insertQuery, [usuarioId, lampara_id], (err3) => {
        if (err3) {
          console.error(err3);
          return res.status(500).json({ msg: "Error del servidor" });
        }
        return res.json({ agregado: true });
      });
    }
  });
};

export const getFavoritos = (req, res) => {
    const usuarioId = req.user.id;  // <-- CORREGIDO
  if (!usuarioId) return res.status(401).json({ msg: "No estás logueado" });

  const query = "SELECT lampara_id FROM favoritos WHERE usuario_id = ?";
  connection.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ msg: "Error del servidor" });
    }
    const favoritos = results.map(f => f.lampara_id);
    res.json(favoritos);
  });
};


export const deleteFavorito = (req, res) => {
   const usuarioId = req.user.id;
  const lamparaId = req.params.id;

  if (!usuarioId)
    return res.status(401).json({ msg: "No estás logueado" });

  const deleteQuery = "DELETE FROM favoritos WHERE usuario_id = ? AND lampara_id = ?";

  connection.query(deleteQuery, [usuarioId, lamparaId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ msg: "Error del servidor" });
    }
    res.json({ eliminado: true });
  });
};
