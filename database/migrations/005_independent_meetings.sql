CREATE TABLE IF NOT EXISTS reunioes (
  id int NOT NULL AUTO_INCREMENT,
  workspace_id int DEFAULT NULL,
  titulo varchar(120) NOT NULL,
  criado_por_usuario_id int NOT NULL,
  criado_por_membro_id int DEFAULT NULL,
  status varchar(20) NOT NULL DEFAULT 'aberta',
  criada_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  encerrada_em datetime DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_reunioes_workspace_status (workspace_id, status),
  KEY idx_reunioes_criador (criado_por_usuario_id),
  CONSTRAINT fk_reunioes_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT fk_reunioes_criador_usuario
    FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_reunioes_criador_membro
    FOREIGN KEY (criado_por_membro_id) REFERENCES workspace_membros(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reuniao_convites (
  id int NOT NULL AUTO_INCREMENT,
  reuniao_id int NOT NULL,
  usuario_id int NOT NULL,
  membro_id int DEFAULT NULL,
  status varchar(20) NOT NULL DEFAULT 'pendente',
  convidado_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  respondido_em datetime DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reuniao_convites_reuniao_usuario (reuniao_id, usuario_id),
  KEY idx_reuniao_convites_usuario_status (usuario_id, status),
  KEY idx_reuniao_convites_membro (membro_id),
  CONSTRAINT fk_reuniao_convites_reuniao
    FOREIGN KEY (reuniao_id) REFERENCES reunioes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reuniao_convites_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_reuniao_convites_membro
    FOREIGN KEY (membro_id) REFERENCES workspace_membros(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reuniao_participantes (
  id int NOT NULL AUTO_INCREMENT,
  reuniao_id int NOT NULL,
  usuario_id int NOT NULL,
  membro_id int DEFAULT NULL,
  socket_id varchar(100) NOT NULL,
  entrou_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  saiu_em datetime DEFAULT NULL,
  mutado tinyint(1) NOT NULL DEFAULT 0,
  ativo tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_reuniao_participantes_reuniao_ativo (reuniao_id, ativo),
  KEY idx_reuniao_participantes_usuario_ativo (usuario_id, ativo),
  KEY idx_reuniao_participantes_socket (socket_id),
  KEY idx_reuniao_participantes_membro (membro_id),
  CONSTRAINT fk_reuniao_participantes_reuniao
    FOREIGN KEY (reuniao_id) REFERENCES reunioes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reuniao_participantes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_reuniao_participantes_membro
    FOREIGN KEY (membro_id) REFERENCES workspace_membros(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
