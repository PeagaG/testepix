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

// 👉 Servir o build do Vite
app.use(express.static(path.join(__dirname, "dist")));

// 👉 Healthcheck
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 👉 Exemplo de rota PIX (edite com suas configs da PushinPay/SyncPay)
app.post("/pix", async (req, res) => {
  try {
    const response = await axios.post("https://api.pushinpay.com.br/api/pix/cashIn", {
      value: req.body.value,
      webhook_url: "https://seusite.com/webhook",
      split_rules: []
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PUSHINPAY_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao gerar PIX" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
