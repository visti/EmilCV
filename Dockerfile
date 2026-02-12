FROM nginx:alpine

COPY public /usr/share/nginx/html
RUN cd /usr/share/nginx/html/notes && ls *.md 2>/dev/null | sort | sed 's/.*/"&"/' | paste -sd, | sed 's/^/[/;s/$/]/' > manifest.json
