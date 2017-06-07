# Pull base image
FROM ubuntu:14.04

######
# Install node and tools
######

# Update packages
# Install some packages we need
# Install Node.JS
RUN apt-get -y update && apt-get -y upgrade && \
    apt-get install -y curl && \
    apt-get install -y apt-transport-https ca-certificates && \
    apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D && \
    echo "deb https://apt.dockerproject.org/repo ubuntu-trusty main" >> /etc/apt/sources.list.d/docker.list && \
    sudo apt-get -y update && \
    sudo apt-get install -y docker-engine && \
    cd /usr/local && \
    curl https://nodejs.org/dist/v4.6.2/node-v4.6.2-linux-x64.tar.gz | tar --strip-components=1 -zxf- && cd && \
    npm install -g forever && \
    npm install -g gulp

# Deploy project

COPY service.properties.template /data00/templates/store/
COPY logback.xml.template /data00/templates/store/
COPY services.json.template /data00/templates/store/
COPY conf/ansible /data00/templates/store/ansible

RUN mkdir -p /opt/fake-vtj-properties
RUN ln -s /data00/deploy/fake-vtj.properties /opt/fake-vtj-properties/fake-vtj.properties
RUN ln -s /data00/deploy/services.json /opt/fake-vtj-properties/services.json
RUN ln -s /data00/deploy/logback.xml /logback.xml

######
# Create directories
######

# Define working directory
ENV deploy_dir /opt/e-identification/fake-vtj/
RUN mkdir -p ${deploy_dir}
WORKDIR ${deploy_dir}

# Logging dir
ENV log_dir /opt/e-identification/fake-vtj/logs/
RUN mkdir -p ${log_dir}

ADD . ${deploy_dir}
RUN rm -rf node_modules/
RUN npm install
EXPOSE 8080
CMD forever start -o /data00/logs/fake-registry.log -e /data00/logs/fake-registry.log -a --uid fake-registry app.js 8080 && \
    forever start -o /data00/logs/fake-registry2.log -e /data00/logs/fake-registry2.log -a --uid fake-registry2 app.js 8081 && \
    forever start -o /data00/logs/controller.log -e /data00/logs/controller.log -a --uid controller controller.js 8082 && \
    tail -f /etc/hosts
