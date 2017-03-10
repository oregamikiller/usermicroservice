FROM node:7.5.0
ENV PATH /usr/bin/:$PATH
WORKDIR /usermicroservice
ADD package.json /usermicroservice/package.json
RUN npm install --silent \
    && npm cache clean \
    && rm -rf npm*
ADD config.js /usermicroservice/config.js
ADD index.js /usermicroservice/index.js

EXPOSE 10002

CMD ["node", "index"]
