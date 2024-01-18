FROM registry.access.redhat.com/ubi8/nginx-122

# Symlinking nginx logs to stdout and stderr for docker log collection
RUN set -x \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log
    
ADD packages/ui/dist .

CMD ["nginx", "-g", "daemon off;"]