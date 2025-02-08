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
-d '{"prompt": "what students has a progress over 50%"}' \
http://localhost:3002/v1/chat

curl --silent  \
-H "Content-Type: application/json" \
-X POST \
-d '{"prompt": "how many students bought the Formação JavaScript Expert course"}' \
http://localhost:3002/v1/chat

curl --silent  \
-H "Content-Type: application/json" \
-X POST \
-d '{"prompt": "quantos alunos ingressaram no curso Criando seu Próprio App Zoom com WebRTC e WebSockets"}' \
http://localhost:3002/v1/chat

curl --silent  \
-H "Content-Type: application/json" \
-X POST \
-d '{"prompt": "quantas vendas aconteceram"}' \
http://localhost:3002/v1/chat

curl --silent  \
-H "Content-Type: application/json" \
-X POST \
-d '{"prompt": "quantos reembolsos tiveram?"}' \
http://localhost:3002/v1/chat

curl --silent  \
-H "Content-Type: application/json" \
-X POST \
-d '{"prompt": "qual a quantidade de reembolsos?"}' \
http://localhost:3002/v1/chat

curl --silent  \
-H "Content-Type: application/json" \
-X POST \
-d '{"prompt": "quem são os alunos que possuem progresso maior que 50%?"}' \
http://localhost:3002/v1/chat