# Super Quiz Divertido no WhatsApp 🎉

Um bot de quiz interativo, divertido e educativo para WhatsApp, pensado para crianças, mas flexível para todas as idades! Jogue, aprenda, desafie amigos e suba no ranking dos gênios do quiz! 🏆

## ✨ Funcionalidades

- **Cadastro simples**: basta informar seu nome e confirmar.
- **Imagem de boas-vindas**: receba uma saudação animada com imagem ao entrar.
- **Escolha intuitiva de temas**: menu com temas populares, opção "Tema Livre" e seleção por número ou nome.
- **Perguntas animadas**: textos claros, divertidos e com emojis.
- **Rodadas equilibradas**: 5 perguntas por quiz (2 fáceis, 2 médias, 1 super desafio).
- **Tempos diferenciados**: 30s para perguntas normais, 1min para o super desafio.
- **Dicas inteligentes**: peça uma dica a qualquer momento digitando "dica".
- **Ranking em tempo real**: veja os melhores jogadores com o comando `rank`.
- **Comandos fáceis**: `quiz <tema>`, `rank`, `sair` (aceita qualquer capitalização).
- **Fluxo sem loops infinitos**: quiz encerra após tempo ou término das perguntas.
- **UX amigável**: mensagens motivacionais, delays naturais e navegação clara.

## 🚀 Como usar

1. **Clone o repositório**

```bash
git clone <url-do-repo>
cd quiz-wpp
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure a API do Gemini**

Crie um arquivo `.env` na raiz com sua chave:

```
GOOGLE_API_KEY=SuaChaveAqui
```

4. **Adicione a imagem de boas-vindas**

Coloque uma imagem chamada `welcome.png` na pasta `assets/` (já incluso no projeto).

5. **Inicie o bot**

```bash
node bot.js
```

6. **Escaneie o QR Code**

Abra o WhatsApp, escaneie o QR code exibido no terminal e pronto!

## 📱 Comandos principais

- `quiz <tema>` — Inicia um quiz com o tema escolhido (ex: `quiz animais`)
- Responda o menu de temas com o número ou nome para jogar
- `dica` — Recebe uma dica divertida para a pergunta atual
- `sair` — Sai do quiz a qualquer momento
- `rank` — Mostra o ranking dos melhores jogadores

## 🧩 Temas sugeridos

- Animais 🦁
- Filmes 🎬
- Conhecimentos Gerais 🌎
- Esportes ⚽
- Cores 🎨
- Frutas 🍎
- Planetas 🪐
- Profissões 👩‍🚒
- Países 🌍
- Tema Livre (você escolhe!)

## 🏗️ Estrutura do Projeto

- `bot.js` — Código principal do bot
- `quiz.db` — Banco de dados SQLite (criado automaticamente)
- `assets/welcome.png` — Imagem de boas-vindas
- `package.json` — Dependências do projeto

## 🛠️ Tecnologias

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [Google Gemini API](https://ai.google.dev/)
- [sqlite3](https://www.npmjs.com/package/sqlite3)
- Node.js

## 👶 Público-alvo

- Crianças, adolescentes, famílias, professores e qualquer pessoa que queira aprender brincando!

## 💡 Dicas de uso

- O bot é 100% interativo: siga as instruções, use emojis e divirta-se!
- O ranking é atualizado a cada quiz.
- Você pode jogar quantas vezes quiser, com temas diferentes.
- O comando `rank` funciona em qualquer momento.

## 📝 Personalização

- Adicione mais temas editando o menu em `bot.js`.
- Troque a imagem de boas-vindas por outra em `assets/welcome.png`.
- Ajuste textos e regras conforme seu público.

## 🐞 Problemas conhecidos

- Dependência da API do Gemini para geração de perguntas e dicas.
- Limite de perguntas por tema depende da criatividade da IA.

## 📄 Licença

MIT. Sinta-se livre para usar, modificar e compartilhar!

---

Feito com 💙 para tornar o aprendizado mais divertido no WhatsApp!
