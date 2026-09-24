import express from "express";
import connection from "../config/db.js";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";
import { verificarToken, soloAdmin } from "../middleware/authMiddleware.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const db = connection.promise();


// ======================================
// OBTENER OPCIONES
// ======================================
router.get("/pago/opciones", async (req, res) => {
    try {
        const [metodos] = await db.query(
            "SELECT * FROM metodos_pago WHERE estado = 'activo'"
        );

        const [cuotas] = await db.query(
            "SELECT * FROM cuotas WHERE estado = 'activo' ORDER BY numero_cuotas"
        );

        res.json({ metodos, cuotas });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================================
// CREAR PEDIDO (CORREGIDO Y OPTIMIZADO)
// ======================================
router.post("/pago/crear-pedido", async (req, res) => {
    try {
        const { usuario_id, lamparas, metodo_pago, numero_cuotas } = req.body;

        if (!usuario_id || !lamparas?.length) {
            return res.status(400).json({ error: "Datos incompletos o carrito vacío." });
        }

        await db.beginTransaction();

        // 1. VALIDAR STOCK Y PRECIOS REALES
        for (const item of lamparas) {
            // Validamos que el frontend no envíe datos corruptos o vacíos
            if (!item.lampara_id) {
                throw new Error("Estructura de producto inválida en el carrito (falta lampara_id).");
            }

            const [rows] = await db.query(
                "SELECT stock, precio, nombre FROM lamparas WHERE id = ? FOR UPDATE",
                [item.lampara_id]
            );

            if (rows.length === 0) {
                throw new Error(`El producto con ID ${item.lampara_id} no existe en la base de datos.`);
            }

            if (rows[0].stock < item.cantidad) {
                throw new Error(`Stock insuficiente para ${rows[0].nombre}. Disponible: ${rows[0].stock}`);
            }

            // Asignamos el precio real guardado de forma segura en la DB
            item.precio = rows[0].precio;
        }

        // Calcular el total base
        const precioBase = lamparas.reduce(
            (acc, item) => acc + item.precio * item.cantidad,
            0
        );

        // 2. VERIFICAR MÉTODO DE PAGO
        const [metodoRows] = await db.query(
            "SELECT * FROM metodos_pago WHERE nombre = ? AND estado = 'activo'",
            [metodo_pago]
        );

        if (metodoRows.length === 0) {
            throw new Error(`El método de pago '${metodo_pago}' no está registrado o no se encuentra activo.`);
        }

        let cuotaId = null;
        let precioFinal = precioBase;
        let interesesMonto = 0;

        // Calcular recargo por cuotas si es crédito
        if (metodo_pago.toLowerCase() === "credito" && numero_cuotas) {
            const [cuotaRows] = await db.query(
                "SELECT * FROM cuotas WHERE numero_cuotas = ? AND estado = 'activo'",
                [numero_cuotas]
            );

            if (cuotaRows.length > 0) {
                cuotaId = cuotaRows[0].id;
                interesesMonto = precioBase * (cuotaRows[0].interes / 100);
                precioFinal = precioBase + interesesMonto;
            }
        }

        // 3. INSERTAR CABECERA DEL PEDIDO
        const [pedidoResult] = await db.query(
            `INSERT INTO pedidos
            (usuario_id, metodo_pago_id, cuota_id, precio_base, precio_final, intereses, estado_pago)
             VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`,
            [
                usuario_id,
                metodoRows[0].id,
                cuotaId,
                precioBase,
                precioFinal,
                interesesMonto
            ]
        );

        const pedidoId = pedidoResult.insertId;

        // Generar número de orden elegante
        const year = new Date().getFullYear();
        const numeroOrden = `ORD-${year}-${String(pedidoId).padStart(5, '0')}`;

        await db.query(
            "UPDATE pedidos SET numero_orden = ? WHERE id = ?",
            [numeroOrden, pedidoId]
        );

        // 4. INSERTAR DETALLES Y DESCONTRAR STOCK (Mapeo secuencial seguro)
        for (const item of lamparas) {
            await db.query(
                "INSERT INTO detalle_pedido (pedido_id, lampara_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
                [pedidoId, item.lampara_id, item.cantidad, item.precio]
            );

            await db.query(
                "UPDATE lamparas SET stock = stock - ? WHERE id = ?",
                [item.cantidad, item.lampara_id]
            );
        }

        // Consolidamos la transacción de forma definitiva
        await db.commit();

        res.json({
            success: true,
            pedido_id: pedidoId,
            numero_orden: numeroOrden
        });

    } catch (error) {
        // Si algo falló en cualquier punto, se deshacen todos los inserts automáticamente
        await db.rollback();
        console.error(" ERROR CRÍTICO EN TRANSACCIÓN DE COMPRA:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ======================================
// CALCULAR PRECIO
// ======================================
router.post("/pago/calcular", async (req, res) => {
    try {
        const { precio_base, metodo_pago, numero_cuotas } = req.body;

        let precioBase = parseFloat(precio_base);
        let precioFinal = precioBase;
        let interesesMonto = 0;
        let numeroCuotas = 1;

        if (metodo_pago === "credito" && numero_cuotas) {
            const [cuotas] = await db.query(
                "SELECT * FROM cuotas WHERE numero_cuotas = ? AND estado = 'activo'",
                [numero_cuotas]
            );

            if (cuotas.length > 0) {
                numeroCuotas = numero_cuotas;
                interesesMonto = precioBase * (cuotas[0].interes / 100);
                precioFinal = precioBase + interesesMonto;
            }
        }

        res.json({
            precio_base: precioBase,
            precio_final: precioFinal,
            intereses_monto: interesesMonto,
            valor_cuota: precioFinal / numeroCuotas,
            numero_cuotas: numeroCuotas
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ======================================
// MARCAR COMO PAGADO
// ======================================
router.put("/pago/marcar-pagado/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [pedido] = await db.query(
            "SELECT estado_pago FROM pedidos WHERE id = ?",
            [id]
        );

        if (!pedido.length)
            return res.status(404).json({ error: "Pedido no encontrado" });

        if (pedido[0].estado_pago !== "pendiente")
            return res.status(400).json({ error: "Pedido no pendiente" });

        await db.query(
            "UPDATE pedidos SET estado_pago = 'pagado', fecha_pago = NOW() WHERE id = ?",
            [id]
        );

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ======================================
// CANCELAR PEDIDO
// ======================================
router.put("/pago/cancelar/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db.beginTransaction();

        const [pedido] = await db.query(
            "SELECT estado_pago FROM pedidos WHERE id = ? FOR UPDATE",
            [id]
        );

        if (!pedido.length)
            throw new Error("Pedido no encontrado");

        if (pedido[0].estado_pago === "pagado")
            throw new Error("No se puede cancelar un pedido pagado");

        if (pedido[0].estado_pago === "cancelado")
            throw new Error("Pedido ya cancelado");

        const [detalles] = await db.query(
            "SELECT lampara_id, cantidad FROM detalle_pedido WHERE pedido_id = ?",
            [id]
        );

        for (const item of detalles) {
            await db.query(
                "UPDATE lamparas SET stock = stock + ? WHERE id = ?",
                [item.cantidad, item.lampara_id]
            );
        }

        await db.query(
            "UPDATE pedidos SET estado_pago = 'cancelado' WHERE id = ?",
            [id]
        );

        await db.commit();

        res.json({ success: true });

    } catch (error) {
        await db.rollback();
        res.status(500).json({ error: error.message });
    }
});

router.get("/pago/comprobante/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [pedidoRows] = await connection.promise().query(
      `SELECT p.*, u.nombre AS usuario_nombre, u.email
       FROM pedidos p
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (pedidoRows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const [productosRows] = await connection.promise().query(
      `SELECT dp.*, l.nombre AS lampara_nombre
       FROM detalle_pedido dp
       JOIN lamparas l ON dp.lampara_id = l.id
       WHERE dp.pedido_id = ?`,
      [id]
    );

    res.json({
      pedido: pedidoRows[0],
      productos: productosRows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo comprobante" });
  }
});




router.get("/pago/comprobante/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await connection.promise().query(
      `SELECT p.id, p.estado_pago, p.precio_final, p.created_at,
              u.nombre, u.email
       FROM pedidos p
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No se encontró el comprobante" });
    }

    const pedido = rows[0];

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=comprobante_${pedido.id}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(18).text("COMPROBANTE DE PAGO", { align: "center" });
    doc.moveDown();
    doc.text(`Pedido N°: ${pedido.id}`);
    doc.text(`Cliente: ${pedido.nombre}`);
    doc.text(`Email: ${pedido.email}`);
    doc.text(`Estado: ${pedido.estado_pago}`);
    doc.text(`Total: $${pedido.precio_final}`);
    doc.text(`Fecha: ${pedido.created_at}`);

    doc.end();

  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error generando comprobante" });
    }
  }
});




// ============================================
// FILTRAR PEDIDOS ADMIN POR FECHA (CORREGIDO)
// ============================================
router.get("/admin/pedidos", verificarToken, soloAdmin, (req, res) => {
  const { desde, hasta } = req.query;

  let sql = `
    SELECT 
      p.id,
      p.precio_final,
      p.estado_pago,
      p.created_at,
      p.numero_orden,
      u.nombre AS usuario_nombre,
      u.email
    FROM pedidos p
    JOIN usuarios u ON p.usuario_id = u.id
    WHERE 1=1
  `;

  const params = [];

  //  FILTRO DESDE: Tomamos desde el inicio de ese día (00:00:00)
  if (desde) {
    sql += " AND p.created_at >= ?";
    params.push(`${desde} 00:00:00`);
  }

  //  FILTRO HASTA: Le sumamos explícitamente todo el día completo hasta la última fracción de segundo (23:59:59)
  // Esto absorbe de forma matemática cualquier desfasaje por zonas horarias (UTC)
  if (hasta) {
    sql += " AND p.created_at <= ?";
    params.push(`${hasta} 23:59:59`);
  }

  // ORDEN
  sql += " ORDER BY p.created_at DESC";

  connection.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error obteniendo pedidos:", err);
      return res.status(500).json({ error: "Error obteniendo pedidos" });
    }

    res.json(results);
  });
});

// DETALLE DE PEDIDO ADMIN
router.get("/admin/pedidos/:id", verificarToken, soloAdmin, (req, res) => {

  const { id } = req.params;

  const sql = `
    SELECT 
      dp.cantidad,
      dp.precio_unitario,
      l.nombre,
      l.ruta_imagen
    FROM detalle_pedido dp
    JOIN lamparas l ON dp.lampara_id = l.id
    WHERE dp.pedido_id = ?
  `;

  connection.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error obteniendo detalle:", err);
      return res.status(500).json({ error: "Error obteniendo detalle" });
    }

    res.json(results);
  });
});

router.put("/admin/pedidos/:id/estado", verificarToken, soloAdmin, (req, res) => {

  const { id } = req.params;
  const { estado_pago } = req.body;

  const sql = "UPDATE pedidos SET estado_pago = ? WHERE id = ?";

  connection.query(sql, [estado_pago, id], (err) => {
    if (err) {
      console.error("Error actualizando estado:", err);
      return res.status(500).json({ error: "Error actualizando estado" });
    }

    res.json({ message: "Estado actualizado correctamente" });
  });
});


export default router;

