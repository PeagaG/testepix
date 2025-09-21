// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Servir o build do Vite (pasta dist)
app.use(express.static(path.join(__dirname, "dist")));

// Healthcheck para o front
app.get("/health", (req, res) => {
  res.json({ ok: true, hasToken: Boolean(process.env.PUSHINPAY_TOKEN) });
});

// Endpoint que gera PIX via PushinPay
app.post("/pix", async (req, res) => {
  try {
    const token = process.env.PUSHINPAY_TOKEN;
    if (!token) return res.status(500).json({ error: "Token ausente no servidor" });

    const { value, webhook_url, split_rules } = req.body;

    const { data } = await axios.post(
      "https://api.pushinpay.com.br/api/pix/cashIn",
      {
        value,                                       // em centavos (1000 = R$10,00)
        webhook_url: webhook_url || undefined,       // opcional
        split_rules: Array.isArray(split_rules) ? split_rules : []
      },
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
      raw: data
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
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

