const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  ensureWorkspaceMembership,
} = require("../services/workspaceService");

async function register(req, res) {
  const { nome, email, senha } = req.body;

  try {
    const hash = await bcrypt.hash(senha, 10);

    const [result] = await db.query(
      "INSERT INTO usuarios (nome, email, senha, cargo) VALUES (?, ?, ?, ?)",
      [nome, email, hash, "usuario"]
    );

    await ensureWorkspaceMembership(result.insertId, "usuario");

    res.json({ mensagem: "Usuário criado com sucesso" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ erro: "Email já cadastrado" });
    }

    console.error("Erro ao registrar:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
}

async function login(req, res) {
  const { email, senha } = req.body;

  try {
    const user = await buscarUsuarioPorEmail(email);

    if (!user) {
      return res.status(400).json({ erro: "Usuário não encontrado" });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ erro: "Senha incorreta" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo || "usuario",
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.json({
      mensagem: "Login OK",
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo || "usuario",
      },
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
}

async function logout(req, res) {
  res.clearCookie("token");
  res.json({ mensagem: "Logout realizado" });
}

async function getPerfil(req, res) {
  try {
    const usuario = await buscarUsuarioPorId(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    res.json(usuario);
  } catch (err) {
    console.error("Erro ao buscar perfil:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
}

async function atualizarPerfil(req, res) {
  const { nome, bio, senhaAtual, novaSenha } = req.body;

  try {
    const [results] = await db.query("SELECT * FROM usuarios WHERE id = ?", [
      req.usuario.id,
    ]);

    if (results.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const user = results[0];

    if (senhaAtual && novaSenha) {
      const senhaValida = await bcrypt.compare(senhaAtual, user.senha);

      if (!senhaValida) {
        return res.status(401).json({ erro: "Senha atual incorreta" });
      }

      const hash = await bcrypt.hash(novaSenha, 10);

      await db.query(
        "UPDATE usuarios SET nome = ?, bio = ?, senha = ? WHERE id = ?",
        [nome || user.nome, bio || null, hash, req.usuario.id]
      );
    } else {
      await db.query("UPDATE usuarios SET nome = ?, bio = ? WHERE id = ?", [
        nome || user.nome,
        bio || null,
        req.usuario.id,
      ]);
    }

    res.json({ mensagem: "Perfil atualizado com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
}

module.exports = {
  register,
  login,
  logout,
  getPerfil,
  atualizarPerfil,
};
