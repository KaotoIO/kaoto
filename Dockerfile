FROM nginxinc/nginx-unprivileged

ADD packages/ui/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]