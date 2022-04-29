FROM node:18

WORKDIR /ob-web/

COPY ./front ./
RUN cd front && npm install

COPY ./backend ./
RUN cd backend && npm install

COPY ./bin/dev.sh ./
