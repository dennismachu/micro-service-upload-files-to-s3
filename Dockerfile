FROM node:latest

ENV AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
ENV AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
ENV AWS_REGION="${AWS_REGION}"
ENV AWS_S3_BUCKET_NAME="${AWS_S3_BUCKET_NAME}"
ENV AWS_SDK_LOAD_CONFIG=true
#ENV PORT="${PORT}"
ENV MULTIPLE_FILE_UPLOAD_LIMIT="${MULTIPLE_FILE_UPLOAD_LIMIT}"

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json .
COPY package-lock.json .
RUN npm install -g npm@7.18.1
RUN npm install

# Copy app source code
COPY . .

#Expose port and start application
EXPOSE 8080
CMD [ "npm", "start" ]