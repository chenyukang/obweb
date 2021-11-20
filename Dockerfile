FROM ubuntu:20.04

RUN apt-get update

RUN mkdir /ob-web
WORKDIR /ob-web


COPY ./bin/ob-web ./
COPY ./bin/rss-reader ./

RUN apt-get install build-essential -y
RUN ./ob-web -h

RUN apt remove --purge nodejs npm
RUN apt clean
RUN apt install -f
RUN apt autoremove
RUN apt-get install curl -y
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get update -y
RUN apt-get install nodejs yarn -y
RUN node -v
RUN npm -v

RUN mkdir /ob-web/front
WORKDIR /ob-web/front
COPY ./front ./
RUN npm install
RUN npm run build

WORKDIR /ob-web/
ENTRYPOINT ["/ob-web/ob-web"]
