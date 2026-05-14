CREATE TABLE IF NOT EXISTS workspaces (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(120) NOT NULL,
  slug varchar(120) NOT NULL,
  plano varchar(30) NOT NULL DEFAULT 'academico',
  status varchar(30) NOT NULL DEFAULT 'ativo',
  criado_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_workspaces_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS papeis (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(30) NOT NULL,
  descricao varchar(255) DEFAULT NULL,
  nivel int NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_papeis_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO papeis (nome, descricao, nivel) VALUES
  ('usuario', 'Colaborador com acesso aos canais permitidos', 1),
  ('moderador', 'Pode moderar canais e mensagens', 5),
  ('admin', 'Administrador com acesso completo ao workspace', 10)
ON DUPLICATE KEY UPDATE
  descricao = VALUES(descricao),
  nivel = VALUES(nivel);

INSERT INTO workspaces (nome, slug, plano, status) VALUES
  ('Workspace Engenharia', 'workspace-engenharia', 'academico', 'ativo')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  plano = VALUES(plano),
  status = VALUES(status);

CREATE TABLE IF NOT EXISTS workspace_membros (
  id int NOT NULL AUTO_INCREMENT,
  workspace_id int NOT NULL,
  usuario_id int NOT NULL,
  papel_id int NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'ativo',
  entrou_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_acesso_em datetime DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_workspace_membros_workspace_usuario (workspace_id, usuario_id),
  KEY idx_workspace_membros_usuario (usuario_id),
  KEY idx_workspace_membros_papel (papel_id),
  CONSTRAINT fk_workspace_membros_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT fk_workspace_membros_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_workspace_membros_papel
    FOREIGN KEY (papel_id) REFERENCES papeis(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @default_workspace_id = (
  SELECT id FROM workspaces WHERE slug = 'workspace-engenharia' LIMIT 1
);

INSERT INTO workspace_membros (
  workspace_id,
  usuario_id,
  papel_id,
  status,
  entrou_em
)
SELECT
  @default_workspace_id,
  u.id,
  p.id,
  'ativo',
  COALESCE(u.criado_em, CURRENT_TIMESTAMP)
FROM usuarios u
JOIN papeis p
  ON p.nome = COALESCE(NULLIF(u.cargo, ''), 'usuario')
ON DUPLICATE KEY UPDATE
  papel_id = VALUES(papel_id),
  status = VALUES(status);

SET @schema_name = DATABASE();

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'canais'
    AND COLUMN_NAME = 'workspace_id'
);
SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE canais ADD COLUMN workspace_id int NULL AFTER id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'canais'
    AND COLUMN_NAME = 'tipo'
);
SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE canais ADD COLUMN tipo varchar(30) NOT NULL DEFAULT ''texto'' AFTER descricao',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'canais'
    AND COLUMN_NAME = 'criado_por_membro_id'
);
SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE canais ADD COLUMN criado_por_membro_id int NULL AFTER privado',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'canais'
    AND COLUMN_NAME = 'criado_em'
);
SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE canais ADD COLUMN criado_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER criado_por_membro_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE canais
SET workspace_id = @default_workspace_id
WHERE workspace_id IS NULL;

SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'canais'
    AND INDEX_NAME = 'idx_canais_workspace'
);
SET @ddl = IF(
  @index_exists = 0,
  'CREATE INDEX idx_canais_workspace ON canais (workspace_id)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'mensagens'
    AND COLUMN_NAME = 'membro_id'
);
SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE mensagens ADD COLUMN membro_id int NULL AFTER usuario_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'mensagens'
    AND COLUMN_NAME = 'editada'
);
SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE mensagens ADD COLUMN editada tinyint(1) NOT NULL DEFAULT 0 AFTER texto',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'mensagens'
    AND COLUMN_NAME = 'apagada_em'
);
SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE mensagens ADD COLUMN apagada_em datetime NULL AFTER editada',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE mensagens m
JOIN workspace_membros wm
  ON wm.usuario_id = m.usuario_id
  AND wm.workspace_id = @default_workspace_id
SET m.membro_id = wm.id
WHERE m.membro_id IS NULL;

SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'mensagens'
    AND INDEX_NAME = 'idx_mensagens_membro'
);
SET @ddl = IF(
  @index_exists = 0,
  'CREATE INDEX idx_mensagens_membro ON mensagens (membro_id)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'canal_membros'
    AND COLUMN_NAME = 'membro_id'
);
SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE canal_membros ADD COLUMN membro_id int NULL AFTER usuario_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE canal_membros cm
JOIN workspace_membros wm
  ON wm.usuario_id = cm.usuario_id
  AND wm.workspace_id = @default_workspace_id
SET cm.membro_id = wm.id
WHERE cm.membro_id IS NULL;

SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'canal_membros'
    AND INDEX_NAME = 'idx_canal_membros_membro'
);
SET @ddl = IF(
  @index_exists = 0,
  'CREATE INDEX idx_canal_membros_membro ON canal_membros (membro_id)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'salas_voz'
    AND COLUMN_NAME = 'membro_id'
);
SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE salas_voz ADD COLUMN membro_id int NULL AFTER usuario_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE salas_voz sv
JOIN workspace_membros wm
  ON wm.usuario_id = sv.usuario_id
  AND wm.workspace_id = @default_workspace_id
SET sv.membro_id = wm.id
WHERE sv.membro_id IS NULL;
