import connection from "../config/db.js";

export const obtenerDashboard = (req, res) => {

  // Totales básicos
  connection.query("SELECT COUNT(*) as total FROM usuarios", (err, usuarios) => {
    if (err) return res.status(500).json(err);

    connection.query("SELECT COUNT(*) as total FROM lamparas", (err, lamparas) => {
      if (err) return res.status(500).json(err);

      connection.query("SELECT COUNT(*) as total FROM pedidos", (err, pedidos) => {
        if (err) return res.status(500).json(err);

        connection.query("SELECT COUNT(*) as total FROM comentarios", (err, comentarios) => {
          if (err) return res.status(500).json(err);

          // Ventas pagadas
          connection.query(
            "SELECT IFNULL(SUM(precio_final),0) as total FROM pedidos WHERE estado_pago = 'pagado'",
            (err, ventas) => {
              if (err) return res.status(500).json(err);

              // Estados pedidos
              connection.query(
                `SELECT 
                  SUM(estado_pago = 'pendiente') as pendientes,
                  SUM(estado_pago = 'pagado') as pagados,
                  SUM(estado_pago = 'cancelado') as cancelados
                 FROM pedidos`,
                (err, estados) => {
                  if (err) return res.status(500).json(err);

                  // Últimos pedidos
                  connection.query(
                    `SELECT p.id, u.nombre, p.precio_final, p.estado_pago, p.created_at
                     FROM pedidos p
                     JOIN usuarios u ON u.id = p.usuario_id
                     ORDER BY p.created_at DESC
                     LIMIT 5`,
                    (err, ultimosPedidos) => {
                      if (err) return res.status(500).json(err);

                      // Últimos comentarios
                      connection.query(
                        `SELECT c.comentario, u.nombre, c.fecha
                         FROM comentarios c
                         LEFT JOIN usuarios u ON u.id = c.usuario_id
                         ORDER BY c.fecha DESC
                         LIMIT 5`,
                        (err, ultimosComentarios) => {
                          if (err) return res.status(500).json(err);

                          // Ventas por mes
                          connection.query(
                            `SELECT 
                              MONTH(created_at) as mes,
                              SUM(precio_final) as total
                             FROM pedidos
                             WHERE estado_pago = 'pagado'
                             GROUP BY MONTH(created_at)
                             ORDER BY mes`,
                            (err, ventasMes) => {
                              if (err) return res.status(500).json(err);

                              res.json({
                                usuarios: usuarios[0].total,
                                lamparas: lamparas[0].total,
                                pedidos: pedidos[0].total,
                                comentarios: comentarios[0].total,
                                ventas: ventas[0].total,
                                estados: estados[0],
                                ultimosPedidos,
                                ultimosComentarios,
                                ventasMes
                              });
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        });
      });
    });
  });
};