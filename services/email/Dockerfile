FROM node:22-bookworm-slim
WORKDIR /service
COPY package.json ./
WORKDIR /service/services/email
COPY services/email/package*.json ./
RUN npm ci
COPY services/email/src ./src
COPY services/email/migrations ./migrations
COPY lib/mail-transport.ts /service/lib/mail-transport.ts
ENV HOST=0.0.0.0 PORT=4318 EMAIL_DATABASE_PATH=/data/email.sqlite
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 4318
CMD ["npm", "start"]
