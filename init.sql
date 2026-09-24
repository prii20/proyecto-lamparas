-- Inicialización de la base de datos para el proyecto "simulador_lamparas"
-- Crea la base de datos, tablas necesarias y datos de ejemplo mínimos

CREATE DATABASE IF NOT EXISTS simulador_lamparas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE simulador_lamparas;

-- Tabla usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'user',
  creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla lamparas
CREATE TABLE IF NOT EXISTS lamparas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50),
  ruta_imagen VARCHAR(255),
  precio DECIMAL(10,2) NOT NULL DEFAULT 0;
  creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla comentarios
CREATE TABLE IF NOT EXISTS comentarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  lamparas_id INT,
  comentario TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (lamparas_id) REFERENCES lamparas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla favoritos
CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id INT NOT NULL,
  lampara_id INT NOT NULL,
  PRIMARY KEY (usuario_id, lampara_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (lampara_id) REFERENCES lamparas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Tabla carrito
CREATE TABLE IF NOT EXISTS carrito (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
-- Tabla detale carrito
CREATE TABLE IF NOT EXISTS detalle_carrito (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carrito_id INT NOT NULL,
    lampara_id INT NOT NULL,
    cantidad INT DEFAULT 1,
    FOREIGN KEY (carrito_id) REFERENCES carrito(id) ON DELETE CASCADE,
    FOREIGN KEY (lampara_id) REFERENCES lamparas(id) ON DELETE CASCADE
);
-- Métodos de pago disponibles
CREATE TABLE IF NOT EXIST metodos_pago (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,        -- efectivo, debito, credito, transferencia
    descripcion VARCHAR(255),
    intereses DECIMAL(5,2) DEFAULT 0,  -- Interés base (para uso futuro)
    icono VARCHAR(50),                   -- Icono para el frontend
    estado ENUM('activo', 'inactivo') DEFAULT 'activo'
);

-- Cuotas disponibles (para crédito y transferencia)
CREATE TABLE IF NOT EXIST cuotas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_cuotas INT NOT NULL,         -- 1, 3, 6, 9, 12, 18
    interes DECIMAL(5,2) NOT NULL,      -- Porcentaje de interés
    descripcion VARCHAR(100),           -- "6 cuotas con 5%"
    estado ENUM('activo', 'inactivo') DEFAULT 'activo'
);

-- Pedidos/Órdenes
CREATE TABLE IF NOT EXIST pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    metodo_pago_id INT,
    cuota_id INT NULL,
    precio_base DECIMAL(10,2) NOT NULL,
    precio_final DECIMAL(10,2) NOT NULL,
    intereses DECIMAL(10,2) DEFAULT 0,
    estado_pago ENUM('pendiente', 'pagado', 'cancelado') DEFAULT 'pendiente',
    instrucciones_pago TEXT,
    fecha_pago TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id),
    FOREIGN KEY (cuota_id) REFERENCES cuotas(id)
);

-- Detalle del pedido
CREATE TABLE IF NOT EXIST detalle_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    lampara_id INT NOT NULL,
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (lampara_id) REFERENCES lamparas(id)
);


-- NUEVO AGREGADO DE LA DB 
USE simulador_lamparas;

ALTER TABLE usuarios ADD COLUMN activo TINYINT DEFAULT 1;
ALTER TABLE lamparas ADD COLUMN activo TINYINT DEFAULT 1;
ALTER TABLE comentarios ADD COLUMN activo TINYINT DEFAULT 1;

ALTER TABLE lamparas 
ADD fecha_eliminado DATETIME NULL;

ALTER TABLE usuarios 
ADD COLUMN reset_token VARCHAR(255),
ADD COLUMN reset_expires DATETIME;
ALTER TABLE usuarios 
ADD fecha_eliminado DATETIME NULL;



-- Carrito de ejemplo
INSERT INTO carrito (usuario_id) VALUES (1);
INSERT INTO detalle_carrito (carrito_id, lampara_id, cantidad) VALUES (1, 1, 1);

INSERT INTO metodos_pago (nombre, descripcion, icono) VALUES 
('efectivo', 'Pago en una sola exhibición', 'bi-cash-stack'),
('debito', 'Tarjeta de débito', 'bi-credit-card'),
('credito', 'Tarjeta de crédito', 'bi-credit-card-2-front'),
('transferencia', 'Transferencia bancaria', 'bi-bank');



INSERT INTO cuotas (numero_cuotas, interes, descripcion) VALUES
(1, 0, '1 cuota sin interés'),
(3, 0, '3 cuotas sin interés'),
(6, 5, '6 cuotas con 5%'),
(9, 8, '9 cuotas con 8%'),
(12, 12, '12 cuotas con 12%'),
(18, 15, '18 cuotas con 15%');



-- Datos de ejemplo para lámparas
INSERT INTO lamparas (nombre, descripcion, tipo, ruta_imagen) VALUES
('Lámpara Mesa Moderna', 'Lámpara de mesa con base metálica y pantalla textil.', 'mesa', '/lamparas/preview/lampara1.jpg'),
('Lámpara Colgante Vintage', 'Colgante estilo vintage con bombilla Edison visible.', 'colgante', '/lamparas/preview/lampara2.jpg'),
('Lámpara de Pie Minimal', 'Lámpara de pie con diseño minimalista y luz ajustable.', 'pie', '/lamparas/preview/lampara3.jpg');

-- Nota: no se insertan usuarios por defecto. Regístrate desde la app o inserta un usuario manualmente con password hasheado.

-- Ejemplo de cómo insertar un usuario (comenta/descomenta según lo necesites):
-- INSERT INTO usuarios (nombre, email, password, rol) VALUES ('Admin', 'admin@example.com', '$2a$08$EXAMPLEHASH..', 'admin');

COMMIT;
