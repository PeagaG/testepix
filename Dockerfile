FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
# Usar install (não 'ci') pois não temos package-lock.json
RUN npm install

COPY . .

# Gera o build estático do Vite. Mantemos as dependências de desenvolvimento
# instaladas para permitir reexecuções de build e diagnósticos dentro do
# container final sem a necessidade de reinstalar pacotes.
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
