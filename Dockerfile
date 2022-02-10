FROM ubuntu:20.04

RUN apt-get update

RUN apt-get install wget
RUN wget https://github.com/chenyukang/obweb/releases/download/v0.2/ob-web-pack.zip
RUN unzip ob-web-pack.zip
WORKDIR /ob-web-pack

RUN chmod +x ./ob-web
RUN ./ob-web

