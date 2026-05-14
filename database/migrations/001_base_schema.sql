CREATE TABLE IF NOT EXISTS usuarios (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  email varchar(100) NOT NULL,
  senha varchar(255) NOT NULL,
  bio varchar(255) DEFAULT NULL,
  cargo varchar(30) DEFAULT 'usuario',
  status varchar(30) DEFAULT 'offline',
  criado_em datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS canais (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  descricao varchar(255) DEFAULT NULL,
  privado tinyint(1) DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_canais_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensagens (
  id int NOT NULL AUTO_INCREMENT,
  usuario_id int NOT NULL,
  canal_id int NOT NULL,
  texto text DEFAULT NULL,
  arquivo_url varchar(255) DEFAULT NULL,
  arquivo_nome varchar(255) DEFAULT NULL,
  arquivo_tipo varchar(100) DEFAULT NULL,
  enviado_em datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mensagens_usuario (usuario_id),
  KEY idx_mensagens_canal (canal_id),
  CONSTRAINT fk_mensagens_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_mensagens_canal
    FOREIGN KEY (canal_id) REFERENCES canais(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salas_voz (
  id int NOT NULL AUTO_INCREMENT,
  canal_id int NOT NULL,
  usuario_id int NOT NULL,
  entrou_em datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_salas_voz_canal_usuario (canal_id, usuario_id),
  KEY idx_salas_voz_usuario (usuario_id),
  CONSTRAINT fk_salas_voz_canal
    FOREIGN KEY (canal_id) REFERENCES canais(id),
  CONSTRAINT fk_salas_voz_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS canal_membros (
  id int NOT NULL AUTO_INCREMENT,
  canal_id int NOT NULL,
  usuario_id int NOT NULL,
  criado_em datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_canal_membros_canal_usuario (canal_id, usuario_id),
  KEY idx_canal_membros_usuario (usuario_id),
  CONSTRAINT fk_canal_membros_canal
    FOREIGN KEY (canal_id) REFERENCES canais(id),
  CONSTRAINT fk_canal_membros_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO canais (nome, descricao, privado) VALUES
  ('geral', 'Canal geral da empresa', 0),
  ('ti', 'Canal do departamento de TI', 0),
  ('rh', 'Canal do departamento de RH', 0),
  ('projetos', 'Canal de acompanhamento de projetos', 0);
