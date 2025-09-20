FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
# Usar install (não 'ci') pois não temos package-lock.json
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
