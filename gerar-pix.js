// gerar-pix.js (corrigido)
const axios = require("axios");
const https = require("https");
const dns = require("dns").promises;
const fs = require("fs");

const TOKEN = "47287|YWMzWw62MLoHgioA2LhF5RY6IRPUFpleoL4M375Gdccc6043";
const HOST = "api.pushinpay.com.br";
const PATH = "/api/pix/cashIn";

async function gerarPix() {
  try {
    // força IPv4
    const [ip] = await dns.resolve4(HOST);
    const httpsAgent = new https.Agent({ servername: HOST, keepAlive: true });

    const url = `https://${ip}${PATH}`;
    const headers = {
      Host: HOST,
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const payload = {
      value: 1000, // R$ 10,00 (em centavos)
      webhook_url: "https://seu-site.com/webhook",
      split_rules: [],
    };

    const { data } = await axios.post(url, payload, { headers, httpsAgent, timeout: 20000 });
    console.log("✅ PIX gerado:");
    console.log(JSON.stringify(data, null, 2));

    // 1) Salvar o texto "copia e cola"
    if (typeof data.qr_code === "string") {
      fs.writeFileSync("pix_copia_e_cola.txt", data.qr_code, "utf8");
      console.log("📝 Copia e cola salvo em pix_copia_e_cola.txt");
    }

    // 2) Salvar a imagem PNG do QR (vem como data URL base64)
    if (typeof data.qr_code_base64 === "string") {
      const base64 = data.qr_code_base64.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync("pix.png", Buffer.from(base64, "base64"));
      console.log("📷 QR Code salvo como pix.png");
    }

  } catch (e) {
    if (e.response) {
      console.error("❌ Erro API:", e.response.status, e.response.data);
    } else {
      console.error("❌ Erro de rede:", e.message);
    }
  }
}

gerarPix();
