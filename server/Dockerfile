FROM node:20-alpine
WORKDIR /app

# Prisma needs openssl on alpine
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/apply-sql.js && node src/index.js"]
