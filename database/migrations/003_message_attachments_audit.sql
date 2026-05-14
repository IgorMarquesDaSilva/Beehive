CREATE TABLE IF NOT EXISTS mensagem_anexos (
  id int NOT NULL AUTO_INCREMENT,
  mensagem_id int NOT NULL,
  nome_original varchar(255) NOT NULL,
  url varchar(500) NOT NULL,
  mime_type varchar(120) DEFAULT NULL,
  tamanho_bytes int DEFAULT NULL,
  criado_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mensagem_anexos_mensagem (mensagem_id),
  CONSTRAINT fk_mensagem_anexos_mensagem
    FOREIGN KEY (mensagem_id) REFERENCES mensagens(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mensagem_anexos (
  mensagem_id,
  nome_original,
  url,
  mime_type,
  criado_em
)
SELECT
  m.id,
  COALESCE(NULLIF(m.arquivo_nome, ''), 'arquivo'),
  m.arquivo_url,
  m.arquivo_tipo,
  COALESCE(m.enviado_em, CURRENT_TIMESTAMP)
FROM mensagens m
WHERE m.arquivo_url IS NOT NULL
  AND m.arquivo_url <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM mensagem_anexos ma
    WHERE ma.mensagem_id = m.id
      AND ma.url = m.arquivo_url
  );

CREATE TABLE IF NOT EXISTS auditoria_logs (
  id int NOT NULL AUTO_INCREMENT,
  workspace_id int DEFAULT NULL,
  membro_id int DEFAULT NULL,
  usuario_id int DEFAULT NULL,
  acao varchar(80) NOT NULL,
  entidade varchar(80) NOT NULL,
  entidade_id int DEFAULT NULL,
  dados_antes json DEFAULT NULL,
  dados_depois json DEFAULT NULL,
  ip varchar(45) DEFAULT NULL,
  user_agent varchar(255) DEFAULT NULL,
  criado_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_workspace (workspace_id),
  KEY idx_auditoria_membro (membro_id),
  KEY idx_auditoria_usuario (usuario_id),
  KEY idx_auditoria_entidade (entidade, entidade_id),
  KEY idx_auditoria_criado_em (criado_em),
  CONSTRAINT fk_auditoria_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT fk_auditoria_membro
    FOREIGN KEY (membro_id) REFERENCES workspace_membros(id),
  CONSTRAINT fk_auditoria_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
