// server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const https = require("https");
const dns = require("dns").promises;
const path = require("path");

const HOST = "api.pushinpay.com.br";
const PATH = "/api/pix/cashIn";

// 🔐 Em produção, use variável de ambiente
const TOKEN = process.env.PUSHINPAY_TOKEN || "47287|YWMzWw62MLoHgioA2LhF5RY6IRPUFpleoL4M375Gdccc6043";

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta /public
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/pix", async (req, res) => {
  try {
    const value = Number(req.body?.value ?? 1000); // centavos (1000 = R$ 10,00)
    const webhook_url = req.body?.webhook_url || "https://seu-site.com/webhook";
    const split_rules = Array.isArray(req.body?.split_rules) ? req.body.split_rules : [];

    // 1) Resolve IPv4 do host
    const [ip] = await dns.resolve4(HOST);
    const httpsAgent = new https.Agent({ servername: HOST, keepAlive: true });

    // 2) Chama pelo IP mantendo Host (SNI ok)
    const url = `https://${ip}${PATH}`;
    const headers = {
      Host: HOST,
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const payload = { value, webhook_url, split_rules };

    const { data } = await axios.post(url, payload, { headers, httpsAgent, timeout: 20000 });

    // Normaliza o retorno só com o que vamos usar no front
    res.json({
      id: data.id,
      status: data.status,
      value: data.value,
      qr_code: data.qr_code,                 // texto "copia e cola"
      qr_code_base64: data.qr_code_base64,   // data URL (png)
    });
  } catch (e) {
    if (e.response) {
      res.status(e.response.status || 400).json(e.response.data);
    } else {
      res.status(500).json({ error: e.message || "Erro interno" });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
