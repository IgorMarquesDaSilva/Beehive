CREATE TABLE IF NOT EXISTS voz_participantes (
  id int NOT NULL AUTO_INCREMENT,
  canal_id int NOT NULL,
  membro_id int DEFAULT NULL,
  usuario_id int NOT NULL,
  entrou_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  saiu_em datetime DEFAULT NULL,
  mutado tinyint(1) NOT NULL DEFAULT 0,
  ativo tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_voz_participantes_canal (canal_id),
  KEY idx_voz_participantes_membro (membro_id),
  KEY idx_voz_participantes_usuario (usuario_id),
  KEY idx_voz_participantes_ativo (ativo),
  CONSTRAINT fk_voz_participantes_canal
    FOREIGN KEY (canal_id) REFERENCES canais(id),
  CONSTRAINT fk_voz_participantes_membro
    FOREIGN KEY (membro_id) REFERENCES workspace_membros(id),
  CONSTRAINT fk_voz_participantes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @default_workspace_id = (
  SELECT id FROM workspaces WHERE slug = 'workspace-engenharia' LIMIT 1
);

INSERT INTO voz_participantes (
  canal_id,
  membro_id,
  usuario_id,
  entrou_em,
  saiu_em,
  mutado,
  ativo
)
SELECT
  sv.canal_id,
  wm.id,
  sv.usuario_id,
  COALESCE(sv.entrou_em, CURRENT_TIMESTAMP),
  NULL,
  0,
  1
FROM salas_voz sv
LEFT JOIN workspace_membros wm
  ON wm.usuario_id = sv.usuario_id
  AND wm.workspace_id = @default_workspace_id
WHERE NOT EXISTS (
  SELECT 1
  FROM voz_participantes vp
  WHERE vp.canal_id = sv.canal_id
    AND vp.usuario_id = sv.usuario_id
    AND vp.ativo = 1
);
