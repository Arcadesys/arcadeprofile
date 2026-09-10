FROM node:22-bookworm-slim
WORKDIR /service
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY migrations ./migrations
ENV HOST=0.0.0.0 PORT=4318 EMAIL_DATABASE_PATH=/data/email.sqlite
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 4318
CMD ["npm", "start"]
