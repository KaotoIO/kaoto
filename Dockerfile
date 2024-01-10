FROM registry.access.redhat.com/ubi8/nginx-122

ADD packages/ui/dist .

CMD ["nginx", "-g", "daemon off;"]