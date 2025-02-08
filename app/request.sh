# curl --silent  \
# -H "Content-Type: application/json" \
# -X POST \
# -d '{"prompt": "quem progrediu abaixo de 80%"}' \
# http://localhost:3002/v1/chat

# curl --silent  \
# -H "Content-Type: application/json" \
# -X POST \
# -d '{"prompt": "quem tem progresso abaixo de 80%"}' \
# http://localhost:3002/v1/chat

# curl --silent  \
# -H "Content-Type: application/json" \
# -X POST \
# -d '{"prompt": "quem progrediu acima de 80%"}' \
# http://localhost:3002/v1/chat

# curl --silent  \
# -H "Content-Type: application/json" \
# -X POST \
# -d '{"prompt": "quem tem progresso acima de 80%"}' \
# http://localhost:3002/v1/chat

curl --silent  \
-H "Content-Type: application/json" \
-X POST \
-d '{"prompt": "quem tem progresso abaixo de 80%"}' \
http://localhost:3002/v1/chat