# Usa Node leve
FROM node:20-alpine

# Pasta de trabalho dentro do container
WORKDIR /app

# Copia apenas os manifests primeiro (cache de dependências)
COPY package*.json ./

# Instala dependências de produção
RUN npm ci --only=production

# Copia o restante do projeto
COPY . .

# Variáveis padrão
ENV NODE_ENV=production
ENV PORT=3000

# Expõe a porta do app
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]
