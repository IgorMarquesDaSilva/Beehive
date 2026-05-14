const db = require("../config/db");

const DEFAULT_WORKSPACE_SLUG =
  process.env.DEFAULT_WORKSPACE_SLUG || "workspace-engenharia";

function isMissingWorkspaceSchemaError(err) {
  return ["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err?.code);
}

async function getDefaultWorkspace() {
  const [workspaces] = await db.query(
    "SELECT id, nome, slug FROM workspaces WHERE slug = ? LIMIT 1",
    [DEFAULT_WORKSPACE_SLUG]
  );

  return workspaces[0] || null;
}

async function ensureWorkspaceMembership(usuarioId, cargo = "usuario") {
  try {
    const workspace = await getDefaultWorkspace();

    if (!workspace) return null;

    const [papeis] = await db.query(
      "SELECT id, nome FROM papeis WHERE nome = ? LIMIT 1",
      [cargo || "usuario"]
    );

    if (papeis.length === 0) return null;

    await db.query(
      `
      INSERT INTO workspace_membros
        (workspace_id, usuario_id, papel_id, status)
      VALUES (?, ?, ?, 'ativo')
      ON DUPLICATE KEY UPDATE
        papel_id = VALUES(papel_id),
        status = VALUES(status)
      `,
      [workspace.id, usuarioId, papeis[0].id]
    );

    const [membros] = await db.query(
      `
      SELECT
        wm.id AS membro_id,
        wm.workspace_id,
        p.nome AS cargo
      FROM workspace_membros wm
      JOIN papeis p ON p.id = wm.papel_id
      WHERE wm.workspace_id = ?
        AND wm.usuario_id = ?
      LIMIT 1
      `,
      [workspace.id, usuarioId]
    );

    return membros[0] || null;
  } catch (err) {
    if (isMissingWorkspaceSchemaError(err)) return null;
    throw err;
  }
}

async function buscarUsuarioPorId(usuarioId, options = {}) {
  const includeSenha = Boolean(options.includeSenha);

  try {
    const [usuarios] = await db.query(
      `
      SELECT
        u.id,
        u.nome,
        u.email,
        ${includeSenha ? "u.senha," : ""}
        u.bio,
        u.criado_em,
        COALESCE(p.nome, u.cargo, 'usuario') AS cargo,
        wm.id AS membro_id,
        w.id AS workspace_id
      FROM usuarios u
      LEFT JOIN workspaces w
        ON w.slug = ?
      LEFT JOIN workspace_membros wm
        ON wm.usuario_id = u.id
        AND wm.workspace_id = w.id
      LEFT JOIN papeis p
        ON p.id = wm.papel_id
      WHERE u.id = ?
      LIMIT 1
      `,
      [DEFAULT_WORKSPACE_SLUG, usuarioId]
    );

    const usuario = usuarios[0];

    if (usuario && !usuario.membro_id) {
      const membro = await ensureWorkspaceMembership(usuario.id, usuario.cargo);

      if (membro) {
        usuario.membro_id = membro.membro_id;
        usuario.workspace_id = membro.workspace_id;
        usuario.cargo = membro.cargo;
      }
    }

    return usuario || null;
  } catch (err) {
    if (!isMissingWorkspaceSchemaError(err)) throw err;

    const columns = includeSenha
      ? "id, nome, email, senha, bio, cargo, criado_em"
      : "id, nome, email, bio, cargo, criado_em";

    const [usuarios] = await db.query(
      `SELECT ${columns} FROM usuarios WHERE id = ? LIMIT 1`,
      [usuarioId]
    );

    return usuarios[0] || null;
  }
}

async function buscarUsuarioPorEmail(email) {
  const [usuarios] = await db.query(
    "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
    [email]
  );

  if (usuarios.length === 0) return null;

  return buscarUsuarioPorId(usuarios[0].id, { includeSenha: true });
}

async function listarUsuariosComCargo() {
  try {
    const [usuarios] = await db.query(
      `
      SELECT
        u.id,
        u.nome,
        u.email,
        COALESCE(p.nome, u.cargo, 'usuario') AS cargo
      FROM usuarios u
      LEFT JOIN workspaces w
        ON w.slug = ?
      LEFT JOIN workspace_membros wm
        ON wm.usuario_id = u.id
        AND wm.workspace_id = w.id
      LEFT JOIN papeis p
        ON p.id = wm.papel_id
      ORDER BY u.nome ASC
      `,
      [DEFAULT_WORKSPACE_SLUG]
    );

    return usuarios;
  } catch (err) {
    if (!isMissingWorkspaceSchemaError(err)) throw err;

    const [usuarios] = await db.query(
      "SELECT id, nome, email, cargo FROM usuarios ORDER BY nome ASC"
    );

    return usuarios;
  }
}

async function atualizarCargoDoUsuario(usuarioId, cargo) {
  await db.query("UPDATE usuarios SET cargo = ? WHERE id = ?", [
    cargo,
    usuarioId,
  ]);

  await ensureWorkspaceMembership(usuarioId, cargo);
}

async function getMembroIdPorUsuario(usuarioId) {
  const usuario = await buscarUsuarioPorId(usuarioId);

  return usuario?.membro_id || null;
}

module.exports = {
  DEFAULT_WORKSPACE_SLUG,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  ensureWorkspaceMembership,
  listarUsuariosComCargo,
  atualizarCargoDoUsuario,
  getMembroIdPorUsuario,
};
