FROM node

WORKDIR /app

# COPY package-lock.json package-lock.json
COPY package*.json . 

RUN npm install

# COPY index.js index.js
COPY . .

CMD ["node", "index.js"]