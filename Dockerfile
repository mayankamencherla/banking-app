FROM node:9

# Set the work directory
WORKDIR /app

# Adding to cache
ADD package.json /app

RUN npm install

# Add application files
ADD . /app

# Entrypoint script
RUN cp docker-entrypoint.sh /usr/local/bin/ && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose the port
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
