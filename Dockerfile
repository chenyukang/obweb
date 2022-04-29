FROM node:18

WORKDIR /ob-web/

RUN mkdir ./front
COPY ./front ./front
RUN cd front && npm install

RUN mkdir ./backend
COPY ./backend ./
RUN cd backend && npm install

RUN cd front && npm run build
RUN npm run dev

EXPOSE 8006
CMD [ "npm", "run", "dev" ]
