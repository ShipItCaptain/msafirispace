# Build stage -- also what local dev containers run against (see
# docker-compose.yml's `target: build`, with `command: npm start` and live
# source mounted), so hot reload keeps working unchanged.
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .

# CRA bakes REACT_APP_* vars into the bundle at build time, not at container
# runtime -- so this has to be a build arg, not a docker-compose environment:
# entry. Defaults to a same-origin relative path so it works behind whatever
# reverse proxy serves both frontend and backend (see nginx/nginx.conf).
ARG REACT_APP_API_URL=/api/v1
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Production stage -- the default target (no --target flag needed): just the
# static build output, served by nginx instead of the CRA dev server.
FROM nginx:alpine AS production
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
