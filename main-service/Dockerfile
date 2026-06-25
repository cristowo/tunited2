FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Directorio de imágenes subidas desde el panel admin — el volumen montado
# ahí hereda estos permisos, por eso se crea y se asigna antes de bajar privilegios
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
# Ejecutar como usuario sin privilegios (incluido en la imagen oficial de node)
USER node
EXPOSE 3002
CMD ["node", "dist/index.js"]
