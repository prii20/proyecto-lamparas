-- =====================================================
-- SIMULADOR DE LÁMPARAS
-- Inicialización limpia de la base de datos
-- =====================================================

CREATE DATABASE IF NOT EXISTS simulador_lamparas
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE simulador_lamparas;

-- =========================
-- USUARIOS
-- =========================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'user',
    creado_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_expires DATETIME DEFAULT NULL,
    activo TINYINT DEFAULT 1,
    fecha_eliminado DATETIME DEFAULT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================
-- LÁMPARAS
-- =========================
CREATE TABLE IF NOT EXISTS lamparas (
    id INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) DEFAULT NULL,
    ruta_imagen VARCHAR(255) DEFAULT NULL,
    creado_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    activo TINYINT DEFAULT 1,
    fecha_eliminado DATETIME DEFAULT NULL,

    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================
-- COMENTARIOS
-- =========================
CREATE TABLE IF NOT EXISTS comentarios (
    id INT NOT NULL AUTO_INCREMENT,
    usuario_id INT DEFAULT NULL,
    lamparas_id INT DEFAULT NULL,
    comentario TEXT,
    fecha TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT DEFAULT 1,

    PRIMARY KEY (id),
    KEY usuario_id (usuario_id),
    KEY lamparas_id (lamparas_id),

    CONSTRAINT comentarios_ibfk_1
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT comentarios_ibfk_2
        FOREIGN KEY (lamparas_id)
        REFERENCES lamparas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================
-- FAVORITOS
-- =========================
CREATE TABLE IF NOT EXISTS favoritos (
    usuario_id INT NOT NULL,
    lampara_id INT NOT NULL,

    PRIMARY KEY (usuario_id, lampara_id),
    KEY lampara_id (lampara_id),

    CONSTRAINT favoritos_ibfk_1
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT favoritos_ibfk_2
        FOREIGN KEY (lampara_id)
        REFERENCES lamparas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================
-- MÉTODOS DE PAGO
-- =========================
CREATE TABLE IF NOT EXISTS metodos_pago (
    id INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255) DEFAULT NULL,
    intereses DECIMAL(5,2) DEFAULT 0.00,
    icono VARCHAR(50) DEFAULT NULL,
    estado ENUM('activo','inactivo') DEFAULT 'activo',

    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================
-- CUOTAS
-- =========================
CREATE TABLE IF NOT EXISTS cuotas (
    id INT NOT NULL AUTO_INCREMENT,
    numero_cuotas INT NOT NULL,
    interes DECIMAL(5,2) NOT NULL,
    descripcion VARCHAR(100) DEFAULT NULL,
    estado ENUM('activo','inactivo') DEFAULT 'activo',

    PRIMARY KEY (id),
    UNIQUE KEY unique_numero_cuotas (numero_cuotas)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================
-- PEDIDOS
-- =========================
CREATE TABLE IF NOT EXISTS pedidos (
    id INT NOT NULL AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    metodo_pago_id INT DEFAULT NULL,
    cuota_id INT DEFAULT NULL,
    precio_base DECIMAL(10,2) NOT NULL,
    precio_final DECIMAL(10,2) NOT NULL,
    intereses DECIMAL(10,2) DEFAULT 0.00,
    estado_pago ENUM('pendiente','pagado','cancelado')
        DEFAULT 'pendiente',
    instrucciones_pago TEXT,
    fecha_pago TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    numero_orden VARCHAR(30) DEFAULT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY numero_orden (numero_orden),
    KEY usuario_id (usuario_id),
    KEY metodo_pago_id (metodo_pago_id),
    KEY cuota_id (cuota_id),

    CONSTRAINT pedidos_ibfk_1
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id),

    CONSTRAINT pedidos_ibfk_2
        FOREIGN KEY (metodo_pago_id)
        REFERENCES metodos_pago(id),

    CONSTRAINT pedidos_ibfk_3
        FOREIGN KEY (cuota_id)
        REFERENCES cuotas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================
-- DETALLE DE PEDIDOS
-- =========================
CREATE TABLE IF NOT EXISTS detalle_pedido (
    id INT NOT NULL AUTO_INCREMENT,
    pedido_id INT NOT NULL,
    lampara_id INT NOT NULL,
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,

    PRIMARY KEY (id),
    KEY pedido_id (pedido_id),
    KEY lampara_id (lampara_id),

    CONSTRAINT detalle_pedido_ibfk_1
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE,

    CONSTRAINT detalle_pedido_ibfk_2
        FOREIGN KEY (lampara_id)
        REFERENCES lamparas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- DATOS INICIALES NO SENSIBLES
-- =====================================================

INSERT IGNORE INTO metodos_pago
(nombre, descripcion, intereses, icono, estado)
VALUES
('efectivo', 'Pago en efectivo', 0.00, 'bi-cash-stack', 'activo'),
('debito', 'Tarjeta de débito', 0.00, 'bi-credit-card', 'activo'),
('credito', 'Tarjeta de crédito', 0.00, 'bi-credit-card-2-front', 'activo'),
('transferencia', 'Transferencia bancaria', 0.00, 'bi-bank', 'activo');


INSERT IGNORE INTO cuotas
(numero_cuotas, interes, descripcion, estado)
VALUES
(1, 0.00, '1 cuota sin interés', 'activo'),
(3, 0.00, '3 cuotas sin interés', 'activo'),
(6, 5.00, '6 cuotas con 5%', 'activo'),
(9, 8.00, '9 cuotas con 8%', 'activo'),
(12, 12.00, '12 cuotas con 12%', 'activo'),
(18, 15.00, '18 cuotas con 15%', 'activo');

-- No se crean usuarios por defecto.
-- Los usuarios deben registrarse desde la aplicación.