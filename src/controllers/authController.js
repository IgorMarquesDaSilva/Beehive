const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

async function register(req, res) {
  const { nome, email, senha } = req.body;

  try {
    const hash = await bcrypt.hash(senha, 10);
    await db.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
      [nome, email, hash]
    );
    res.json({ mensagem: "Usuário criado com sucesso" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ erro: "Email já cadastrado" });
    }
    res.status(500).json({ erro: "Erro interno" });
  }
}

async function login(req, res) {
  const { email, senha } = req.body;

  try {
    const [results] = await db.query(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );

    if (results.length === 0) {
      return res.status(400).json({ erro: "Usuário não encontrado" });
    }

    const user = results[0];
    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ erro: "Senha incorreta" });
    }

    const token = jwt.sign(
      { id: user.id, nome: user.nome },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({ mensagem: "Login OK", usuario: { id: user.id, nome: user.nome } });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno" });
  }
}

async function logout(req, res) {
  res.clearCookie("token");
  res.json({ mensagem: "Logout realizado" });
}

module.exports = { register, login, logout };