# Build Stage
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build argument for Backend URL (default usually needs to be changed for NAS IP)
# You can pass this via --build-arg in docker-compose
ARG VITE_ENV_API_BACKEND_DOMAIN
ENV VITE_ENV_API_BACKEND_DOMAIN=$VITE_ENV_API_BACKEND_DOMAIN

RUN npm run build

# Production Stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
