// server.js
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const distDir = path.join(__dirname, "dist");
const publicDir = path.join(__dirname, "public");
const hasDistBuild = fs.existsSync(path.join(distDir, "index.html"));

if (!hasDistBuild) {
  console.warn(
    "⚠️  Build do front-end não encontrado em ./dist. Servindo arquivos diretamente de ./public."
  );
}

// Servir o build do Vite (pasta dist) quando existir; caso contrário, usar a pasta pública.
app.use(express.static(hasDistBuild ? distDir : publicDir));

// Healthcheck para o front
app.get("/health", (req, res) => {
  res.json({ ok: true, hasToken: Boolean(process.env.PUSHINPAY_TOKEN) });
});

// Endpoint que gera PIX via PushinPay
app.post("/pix", async (req, res) => {
  try {
    const token = process.env.PUSHINPAY_TOKEN;
    if (!token) return res.status(500).json({ error: "Token ausente no servidor" });

    const { value, webhook_url, split_rules } = req.body ?? {};

    const valueInCents = Number.parseInt(value, 10);
    if (!Number.isFinite(valueInCents) || valueInCents <= 0) {
      return res.status(400).json({ error: "Valor inválido. Informe o valor em centavos." });
    }

    const body = {
      value: valueInCents,
      webhook_url: webhook_url || undefined,
      split_rules: Array.isArray(split_rules) ? split_rules.filter(Boolean) : [],
    };

    const { data } = await axios.post(
      "https://api.pushinpay.com.br/api/pix/cashIn",
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    // Tenta padronizar campos usados no front:
    res.json({
      status: "ok",
      qr_code: data?.payload || data?.qrCode || data?.emv || null,
      qr_code_base64: data?.qrCodeBase64 || null,
      raw: data,
    });
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error("Erro /pix:", status, data || error.message);
    res.status(500).json({ error: "Erro ao gerar PIX", status, data });
  }
});

// SPA fallback (opcional, se tiver rotas de front)
app.get("*", (req, res) => {
  res.sendFile(path.join(hasDistBuild ? distDir : publicDir, "index.html"));
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    console.error(
      `❌ Porta ${PORT} já está em uso. Verifique se outra instância do servidor está ativa ou ajuste a variável PORT.`
    );
    process.exit(1);
  }

  console.error("❌ Erro inesperado ao iniciar o servidor:", err);
  process.exit(1);
});

