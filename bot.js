const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GenerativeModel, GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Configuração da API do Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyAhdKkiDpqXf0pk7bxjCx1vSyAKVs0vhdY');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash', // Se continuar falhando, tente 'gemini-1.5-pro'
  generationConfig: { temperature: 0.8, maxOutputTokens: 500 }
});

// Lista de categorias permitidas
const CATEGORIAS = ['animais', 'filmes', 'conhecimentos gerais'];

// Configuração do banco SQLite
const dbFile = './quiz.db';
const dbExists = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) console.error('Erro ao conectar ao SQLite:', err.message);
  else console.log('Conectado ao banco SQLite.');
});

// Inicializa o banco de dados
if (!dbExists) {
  db.serialize(() => {
    db.run(`CREATE TABLE users (
      phone TEXT PRIMARY KEY,
      name TEXT,
      score INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT,
      question TEXT,
      category TEXT,
      correct_answer TEXT,
      user_answer TEXT,
      is_correct INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(phone) REFERENCES users(phone)
    )`);
  });
}

// Configuração do cliente WhatsApp
const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Bot está pronto! 🚀');
});

client.on('message', async (msg) => {
  const chat = await msg.getChat();
  const userPhone = msg.from;
  let userState = loadUserState(userPhone);

  // Busca usuário no banco
  db.get('SELECT * FROM users WHERE phone = ?', [userPhone], async (err, row) => {
    if (err) {
      msg.reply('😓 Ops, algo deu errado. Tente novamente mais tarde!');
      return;
    }
    // Comando rank deve funcionar em qualquer estado
    if (msg.body.trim().toLowerCase() === 'rank') {
      db.all('SELECT name, score FROM users ORDER BY score DESC LIMIT 5', [], (err, rows) => {
        if (err) {
          msg.reply('😓 Não consegui mostrar o ranking agora. Tente de novo!');
          return;
        }
        let ranking = '🏆 *Super Ranking dos Gênios do Quiz!* 🏆\n\n';
        if (rows.length === 0) ranking += 'Ninguém jogou ainda. Seja o primeiro a brilhar! ✨\n';
        else rows.forEach((row, i) => {
          const medals = ['🥇', '🥈', '🥉', '⭐', '⭐'];
          ranking += `${medals[i]} *${row.name}*: ${row.score} pontos\n`;
        });
        msg.reply(ranking);
      });
      return;
    }
    // Se não tem cadastro e não está aguardando confirmação
    if (!row && !userState.awaitingName && !userState.nameToConfirm) {
      userState = { awaitingName: true };
      saveUserState(userPhone, userState);
      const media = MessageMedia.fromFilePath('./assets/welcome.png');
      await client.sendMessage(userPhone, media, { caption: 'Bem-vindo ao Super Quiz Divertido! 🎉' });
      msg.reply('Qual é o seu nome?');
      return;
    }
    // Se aguardando nome (usuário digitou o nome)
    if (userState.awaitingName && !userState.nameToConfirm && msg.body.trim().length > 1 && !msg.body.toLowerCase().startsWith('quiz') && msg.body.toLowerCase() !== 'rank' && msg.body.toLowerCase() !== 'sair') {
      userState.nameToConfirm = msg.body.trim().split(' ')[0];
      userState.awaitingName = false;
      saveUserState(userPhone, userState);
      msg.reply(`${userState.nameToConfirm}, certo?\nResponda *SIM* para confirmar ou digite outro nome! ✍️`);
      return;
    }
    // Se aguardando confirmação do nome
    if (userState.nameToConfirm) {
      if (msg.body.trim().toLowerCase() === 'sim') {
        const nomeConfirmado = userState.nameToConfirm;
        db.run('INSERT INTO users (phone, name, score) VALUES (?, ?, 0)', [userPhone, nomeConfirmado], (err) => {});
        userState = { inQuiz: false, aguardandoTema: true };
        saveUserState(userPhone, userState);
        // Novo menu intuitivo de temas
        const temasMenu = [
          '1️⃣  Animais',
          '2️⃣  Filmes',
          '3️⃣  C. Geral',
          '4️⃣  Esportes',
          '5️⃣  Cores',
          '6️⃣  Frutas',
          '7️⃣  Planetas',
          '8️⃣  Profissões',
          '9️⃣  Países',
          '🔟  Tema Livre'
        ];
        msg.reply(`🎉 Prontinho, *${nomeConfirmado}*! Agora você faz parte do nosso time de gênios!

Vamos começar? Escolha um tema para o quiz respondendo o número ou o nome do tema:
\n${temasMenu.join('\n')}`);
        return;
      } else if (msg.body.trim().length > 1 && !msg.body.toLowerCase().startsWith('quiz') && msg.body.toLowerCase() !== 'rank' && msg.body.toLowerCase() !== 'sair') {
        userState.nameToConfirm = msg.body.trim().split(' ')[0];
        saveUserState(userPhone, userState);
        msg.reply(`Seu nome será *${userState.nameToConfirm}*, certo?\nResponda *SIM* para confirmar ou digite outro nome! ✍️`);
        return;
      } else {
        msg.reply('Por favor, responda *SIM* para confirmar ou digite seu nome novamente! 😅');
        return;
      }
    }
    // Se já cadastrado, cumprimenta pelo nome
    if (row && !userState.inQuiz && !userState.aguardandoTema && !msg.body.toLowerCase().startsWith('quiz') && msg.body !== 'rank' && msg.body !== 'sair') {
      userState.aguardandoTema = true;
      saveUserState(userPhone, userState);
      const temasMenu = [
        '1️⃣  Animais',
        '2️⃣  Filmes',
        '3️⃣  C. Geral',
        '4️⃣  Esportes',
        '5️⃣  Cores',
        '6️⃣  Frutas',
        '7️⃣  Planetas',
        '8️⃣  Profissões',
        '9️⃣  Países',
        '🔟  Tema Livre'
      ];
      msg.reply(`👋 Olá, *${row.name}*! Pronto para se divertir e aprender?

Escolha um tema para o quiz respondendo o número ou o nome do tema:
\n${temasMenu.join('\n')}`);
      return;
    }
    // Novo fluxo: aguardando escolha de tema
    if (userState.aguardandoTema) {
      const temas = [
        'animais',
        'filmes',
        'conhecimentos gerais',
        'esportes',
        'cores',
        'frutas',
        'planetas',
        'profissões',
        'países'
      ];
      let temaEscolhido = null;
      const body = msg.body.trim().toLowerCase();
      if ([...Array(10).keys()].map(i => (i+1).toString()).includes(body) || body === '10' || body === '🔟') {
        const idx = parseInt(body) - 1;
        if (idx >= 0 && idx < temas.length) temaEscolhido = temas[idx];
        else if (body === '10' || body === '🔟') temaEscolhido = null;
      } else if (body === 'tema livre') {
        temaEscolhido = null;
      } else {
        temaEscolhido = temas.find(t => t === body);
      }
      if (temaEscolhido) {
        userState = { inQuiz: true, tema: temaEscolhido, questionIndex: 0, score: 0, currentQuestion: null, timer: null, rodada: 1 };
        saveUserState(userPhone, userState);
        msg.reply(`🎉 *Oba! Vamos jogar!*\n\n🌟 Tema escolhido: *${temaEscolhido}*\n\nSerão *5 perguntas*: 2 fáceis, 2 médias e 1 super desafio final!\nResponda com 1️⃣, 2️⃣, 3️⃣ ou 4️⃣.\n💡 Precisa de ajuda? Digite *dica*.\n🚪 Para sair, digite *sair*.\n🏆 Para ver os campeões, digite *rank*.`);
        await sendQuestion(userPhone, temaEscolhido, msg);
        return;
      } else if (body === '10' || body === '🔟' || body === 'tema livre') {
        msg.reply('Digite o tema que você quer jogar! (Exemplo: planetas, profissões, etc)');
        userState.aguardandoTema = 'tema livre';
        saveUserState(userPhone, userState);
        return;
      } else if (userState.aguardandoTema === 'tema livre') {
        if (body.length > 2) {
          userState = { inQuiz: true, tema: body, questionIndex: 0, score: 0, currentQuestion: null, timer: null };
          saveUserState(userPhone, userState);
          msg.reply(`🎉 *Oba! Vamos jogar!*\n\n🌟 Tema escolhido: *${body}*\n\nSerão *5 perguntas*: 2 fáceis, 2 médias e 1 super desafio final!\nResponda com 1️⃣, 2️⃣, 3️⃣ ou 4️⃣.\n💡 Precisa de ajuda? Digite *dica*.\n🚪 Para sair, digite *sair*.\n🏆 Para ver os campeões, digite *rank*.`);
          await sendQuestion(userPhone, body, msg);
          return;
        } else {
          msg.reply('Tema muito curto! Digite um tema válido, por favor.');
          return;
        }
      } else {
        msg.reply('Escolha um tema respondendo o número ou o nome! 😉');
        return;
      }
    }

    try {
      if (msg.body.toLowerCase().startsWith('quiz')) {
        let tema = msg.body.slice(4).trim().toLowerCase();
        if (!tema) {
          msg.reply('🎯 Para jogar, digite o tema do quiz depois da palavra *quiz*.\n\nExemplo: *quiz animais*\nTemas para brincar: 🦁 animais, 🎬 filmes, 🌎 conhecimentos gerais, ⚽ esportes, 🎨 cores, 🍎 frutas, 🪐 planetas, 👩‍🚒 profissões, 🌍 países');
          return;
        }
        userState = { inQuiz: true, tema, questionIndex: 0, score: 0, currentQuestion: null, timer: null };
        saveUserState(userPhone, userState);
        msg.reply(`🎉 *Oba! Vamos jogar!*\n\n🌟 Tema escolhido: *${tema}*\n\nResponda com 1️⃣, 2️⃣, 3️⃣ ou 4️⃣.\n💡 Precisa de ajuda? Digite *dica*.\n🚪 Para sair, digite *sair*.\n🏆 Para ver os campeões, digite *rank*.`);
        await sendQuestion(userPhone, tema, msg);
      } else if (msg.body.trim().toLowerCase() === 'rank') {
        db.all('SELECT name, score FROM users ORDER BY score DESC LIMIT 5', [], (err, rows) => {
          if (err) {
            msg.reply('😓 Não consegui mostrar o ranking agora. Tente de novo!');
            return;
          }
          let ranking = '🏆 *Super Ranking dos Gênios do Quiz!* 🏆\n\n';
          if (rows.length === 0) ranking += 'Ninguém jogou ainda. Seja o primeiro a brilhar! ✨\n';
          else rows.forEach((row, i) => {
            const medals = ['🥇', '🥈', '🥉', '⭐', '⭐'];
            ranking += `${medals[i]} *${row.name}*: ${row.score} pontos\n`;
          });
          msg.reply(ranking);
        });
      } else if (msg.body.trim().toLowerCase() === 'sair' && userState.inQuiz) {
        clearTimeout(userState.timer);
        db.run('UPDATE users SET score = score + ? WHERE phone = ?', [userState.score, userPhone], (err) => {});
        msg.reply(`🏁 *Fim do Quiz!* Você fez *${userState.score} pontos*!\nQuer tentar de novo? Digite *quiz <tema>* ou veja os melhores com *rank*!`);
        userState = { inQuiz: false };
        saveUserState(userPhone, userState);
      } else if (userState.inQuiz) {
        if (!['1', '2', '3', '4', 'dica'].includes(msg.body)) {
          msg.reply('Responda com 1️⃣, 2️⃣, 3️⃣, 4️⃣ ou *dica*. 😉');
          return;
        }
        clearTimeout(userState.timer);
        if (msg.body === 'dica') {
          const promptDica = `Dê uma dica divertida e fácil para a pergunta: ${userState.currentQuestion.pergunta}`;
          const dica = await model.generateContent(promptDica);
          let dicaText = '';
          if (
            dica.response &&
            dica.response.candidates &&
            dica.response.candidates[0] &&
            dica.response.candidates[0].content &&
            dica.response.candidates[0].content.parts &&
            dica.response.candidates[0].content.parts[0] &&
            typeof dica.response.candidates[0].content.parts[0].text === 'string'
          ) {
            dicaText = dica.response.candidates[0].content.parts[0].text;
          } else if (dica.response && typeof dica.response.text === 'string') {
            dicaText = dica.response.text;
          } else if (typeof dica === 'string') {
            dicaText = dica;
          } else {
            dicaText = 'Não consegui gerar uma dica agora. Tente novamente!';
          }
          msg.reply(`💡 *Dica*: ${dicaText}\nResponda com 1️⃣, 2️⃣, 3️⃣ ou 4️⃣!`);
          await sendQuestion(userPhone, userState.tema, msg, true);
          return;
        }
        const userAnswer = userState.currentQuestion.opcoes[parseInt(msg.body) - 1];
        // Determina o nível da pergunta para exibir na resposta
        let nivelPergunta = 'Fácil';
        if (userState.questionIndex < 2) nivelPergunta = 'Fácil';
        else if (userState.questionIndex < 4) nivelPergunta = 'Normal';
        else nivelPergunta = 'Super Desafio';
        const isCorrect = userAnswer === userState.currentQuestion.correta;
        userState.score += isCorrect ? 10 : -5;

        db.run(
          'INSERT INTO answers (phone, question, category, correct_answer, user_answer, is_correct) VALUES (?, ?, ?, ?, ?, ?)',
          [userPhone, userState.currentQuestion.pergunta, userState.tema, userState.currentQuestion.correta, userAnswer, isCorrect ? 1 : 0],
          (err) => {}
        );

        const reply = isCorrect
          ? `🎉 *Mandou bem!* +10 pontos! (Total: ${userState.score})\n👏 Você está arrasando!`
          : `❌ *Ops!* A resposta era: ${userState.currentQuestion.correta}. -5 pontos (Total: ${userState.score})\nNão desista, tente a próxima! 💪`;
        msg.reply(reply + `\n\n*Pronto para a próxima?*`);
        userState.questionIndex++;
        saveUserState(userPhone, userState);
        // Delay de 3 segundos antes da próxima pergunta
        setTimeout(() => {
          sendQuestion(userPhone, userState.tema, msg);
        }, 3000);
        return;
      } else {
        msg.reply('👾 Digite *quiz <tema>* para começar a brincar!\nExemplo: *quiz animais*\nTemas: 🦁 animais, 🎬 filmes, 🌎 conhecimentos gerais, ⚽ esportes, 🎨 cores, 🍎 frutas, 🪐 planetas, 👩‍🚒 profissões, 🌍 países.\nVeja os melhores com *rank* 🏆');
      }
    } catch (err) {
      msg.reply('😓 Algo deu errado! Tente novamente ou digite *quiz <tema>* para recomeçar.');
    }
  });
});

// Função para gerar e enviar pergunta com retentativa
async function sendQuestion(userPhone, tema, msg, reuseQuestion = false, retryCount = 0) {
  const maxRetries = 3;
  let userState = loadUserState(userPhone);
  if (!userState.inQuiz) return;

  // Novo: determina dificuldade pela rodada (5 perguntas)
  let dificuldade = 'fácil';
  let nivelExibicao = 'Fácil';
  if (userState.questionIndex >= 0 && userState.questionIndex < 2) { dificuldade = 'fácil'; nivelExibicao = 'Fácil'; }
  else if (userState.questionIndex < 4) { dificuldade = 'normal'; nivelExibicao = 'Normal'; }
  else { dificuldade = 'super desafio'; nivelExibicao = 'Super Desafio'; }

  // Fim do quiz após 5 perguntas
  if (userState.questionIndex >= 5) {
    db.run('UPDATE users SET score = score + ? WHERE phone = ?', [userState.score, userPhone], (err) => {});
    msg.reply(`🏁 *Fim do Quiz!* Você respondeu as 5 perguntas!\nSua pontuação: *${userState.score} pontos*\nQuer jogar de novo? Escolha um tema ou digite *rank* para ver os melhores!`);
    userState.inQuiz = false;
    saveUserState(userPhone, userState);
    return;
  }

  let quizData;
  if (!reuseQuestion) {
    try {
      // Adiciona contexto para evitar perguntas repetidas
      const perguntasAntigas = userState.perguntasFeitas ? userState.perguntasFeitas.join(' | ') : '';
      let prompt;
      if (dificuldade === 'super desafio') {
        prompt = `Gere uma pergunta BEM DIFÍCIL, criativa e desafiadora sobre ${tema} com EXATAMENTE 4 opções de resposta (apenas uma correta) no formato: {"pergunta": "...", "opcoes": ["...", "...", "...", "..."], "correta": "..."}. Não repita perguntas já feitas: ${perguntasAntigas}. Não inclua texto extra, explicações, código ou formatação. Embaralhe as opções. Só o JSON puro!`;
      } else {
        prompt = `Gere uma pergunta de nível ${dificuldade}, divertida e objetiva sobre ${tema} com EXATAMENTE 4 opções de resposta (apenas uma correta) no formato: {"pergunta": "...", "opcoes": ["...", "...", "...", "..."], "correta": "..."}. Não repita perguntas já feitas: ${perguntasAntigas}. Não inclua texto extra, explicações, código ou formatação. Embaralhe as opções. Só o JSON puro!`;
      }
      const response = await model.generateContent(prompt);
      let text = '';
      if (
        response.response &&
        response.response.candidates &&
        response.response.candidates[0] &&
        response.response.candidates[0].content &&
        response.response.candidates[0].content.parts &&
        response.response.candidates[0].content.parts[0] &&
        typeof response.response.candidates[0].content.parts[0].text === 'string'
      ) {
        text = response.response.candidates[0].content.parts[0].text;
      } else if (response.response && typeof response.response.text === 'string') {
        text = response.response.text;
      } else if (typeof response === 'string') {
        text = response;
      } else {
        console.error('Não foi possível extrair texto da resposta do Gemini. Estrutura inesperada.');
        throw new Error('Estrutura inesperada da resposta do Gemini');
      }
      if (typeof text !== 'string') {
        console.error('A resposta do Gemini não é uma string:', text);
        throw new Error('A resposta do Gemini não é uma string');
      }
      // Limpeza aprimorada: pega só o JSON entre o primeiro { e o último }
      let cleanResponse = text.replace(/```json\n?|```/g, '').trim();
      const firstBrace = cleanResponse.indexOf('{');
      const lastBrace = cleanResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1);
      }
      quizData = JSON.parse(cleanResponse);
      // Salva perguntas feitas para evitar repetição
      userState.perguntasFeitas = userState.perguntasFeitas || [];
      userState.perguntasFeitas.push(quizData.pergunta);
      if (!quizData.pergunta || !quizData.opcoes || quizData.opcoes.length !== 4 || !quizData.correta) {
        throw new Error('JSON inválido: estrutura incompleta');
      }
    } catch (err) {
      console.error('Erro ao gerar pergunta:', err.message);
      if (retryCount < maxRetries) {
        console.log(`Tentando novamente (${retryCount + 1}/${maxRetries})...`);
        return await sendQuestion(userPhone, tema, msg, false, retryCount + 1);
      } else {
        msg.reply(`😓 Não consegui gerar uma pergunta para o tema *${tema}* após várias tentativas. Tente outro tema com *quiz <tema>*!\nTemas: ${CATEGORIAS.join(', ')}`);
        userState.inQuiz = false;
        saveUserState(userPhone, userState);
        return;
      }
    }
  } else {
    quizData = userState.currentQuestion;
  }

  userState.currentQuestion = quizData;
  saveUserState(userPhone, userState);

  let questionText = `📝 *Pergunta* (${nivelExibicao}): ${quizData.pergunta}\n`;
  quizData.opcoes.forEach((opcao, i) => {
    questionText += `${i + 1}. ${opcao}\n`;
  });
  questionText += '\n💬 Responda com 1, 2, 3, 4 ou "dica" (' + (userState.questionIndex === 4 ? '1 minuto' : '30 segundos') + ')!\n🚪 Para sair, digite *sair* a qualquer momento.';
  msg.reply(questionText);

  // Tempo: 1 minuto para a última pergunta, 30s para as demais
  const tempoPergunta = userState.questionIndex === 4 ? 60000 : 30000;
  userState.timer = setTimeout(() => {
    msg.reply(`⏰ *Tempo esgotado!*\n\nA resposta certa era: *${quizData.correta}*\n\nQuer tentar de novo? Digite *quiz <tema>* ou veja os melhores com *rank*!`);
    userState.inQuiz = false;
    saveUserState(userPhone, userState);
  }, tempoPergunta);
}

// Gerenciamento de estado do usuário
const userStates = new Map();
function saveUserState(phone, state) {
  userStates.set(phone, state);
}
function loadUserState(phone) {
  return userStates.get(phone) || { inQuiz: false };
}

client.initialize();