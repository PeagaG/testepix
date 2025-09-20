// server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const https = require("https");
const dns = require("dns").promises;
const path = require("path");

const HOST_API = "api.pushinpay.com.br";
const PATH_API = "/api/pix/cashIn";

const TOKEN = process.env.PUSHINPAY_TOKEN; // defina no EasyPanel (.env do app)
if (!TOKEN) {
  console.warn("[WARN] Variável PUSHINPAY_TOKEN não definida. Defina no painel antes de usar /pix.");
}

const app = express();
app.use(cors());
app.use(express.json());

// --------- Frontend estático (public) ----------
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// --------- Healthcheck ----------
app.get("/health", (req, res) => res.json({ ok: true }));

// --------- Rota Pix ----------
app.post("/pix", async (req, res) => {
  try {
    if (!TOKEN) {
      return res.status(500).json({ error: "Token não configurado no servidor (PUSHINPAY_TOKEN)." });
    }

    const value = Number(req.body?.value ?? 1000); // centavos (1000 = R$ 10,00)
    const webhook_url = req.body?.webhook_url || "https://seu-site.com/webhook";
    const split_rules = Array.isArray(req.body?.split_rules) ? req.body.split_rules : [];

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ error: "Valor inválido. Envie 'value' em centavos (> 0)." });
    }

    // Monta headers e payload
    const headers = {
      Host: HOST_API,
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const payload = { value, webhook_url, split_rules };

    // Tenta chamar por IP com SNI; se falhar, usa hostname direto
    let endpointUrl;
    let httpsAgent;

    try {
      const [ip] = await dns.resolve4(HOST_API);
      endpointUrl = `https://${ip}${PATH_API}`;
      httpsAgent = new https.Agent({ servername: HOST_API, keepAlive: true });
    } catch {
      endpointUrl = `https://${HOST_API}${PATH_API}`;
      httpsAgent = new https.Agent({ keepAlive: true });
    }

    const { data } = await axios.post(endpointUrl, payload, {
      headers,
      httpsAgent,
      timeout: 20000,
    });

    // Resposta simplificada para o front
    return res.json({
      id: data.id,
      status: data.status,
      value: data.value,
      qr_code: data.qr_code,               // texto "copia e cola"
      qr_code_base64: data.qr_code_base64, // data URL PNG
    });
  } catch (e) {
    if (e.response) {
      return res.status(e.response.status || 400).json(e.response.data);
    }
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
});

// --------- Inicialização ----------
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
});
