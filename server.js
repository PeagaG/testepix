// server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const https = require("https");
const dns = require("dns").promises;
const path = require("path");

// 🔐 TOKEN FIXO AQUI (substitua pela sua chave real)
const TOKEN = "47524|asw8UJplrxo7yhWp9Y6V3L9QtKaszpCDapdHG6M12e92c9bf";

const HOST_API = "api.pushinpay.com.br";
const PATH_API = "/api/pix/cashIn";

const app = express();
app.use(cors());
app.use(express.json());

// Frontend estático
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// PIX
app.post("/pix", async (req, res) => {
  try {
    if (!TOKEN) return res.status(500).json({ error: "TOKEN ausente no servidor." });

    const value = Number(req.body?.value ?? 1000); // centavos
    const webhook_url = req.body?.webhook_url || "https://seu-site.com/webhook";
    const split_rules = Array.isArray(req.body?.split_rules) ? req.body.split_rules : [];

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ error: "Valor inválido. Envie 'value' em centavos (> 0)." });
    }

    // Monta headers/payload
    const headers = {
      Host: HOST_API,
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const payload = { value, webhook_url, split_rules };

    // Tenta chamar por IP com SNI; se falhar, usa hostname direto
    let endpointUrl, httpsAgent;
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

    res.json({
      id: data.id,
      status: data.status,
      value: data.value,
      qr_code: data.qr_code,               // texto "copia e cola"
      qr_code_base64: data.qr_code_base64, // data URL PNG
    });
  } catch (e) {
    if (e.response) return res.status(e.response.status || 400).json(e.response.data);
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
});

// Sobe servidor (Box Node.js precisa ouvir em 0.0.0.0:3000)
const PORT = 3000;
const HOST = "0.0.0.0";
const server = app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
});

// Encerra com graça em redeploys
process.on("SIGTERM", () => {
  console.log("SIGTERM recebido. Encerrando...");
  server.close(() => process.exit(0));
});
