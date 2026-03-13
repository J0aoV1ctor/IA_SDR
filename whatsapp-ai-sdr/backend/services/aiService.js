const { OpenAI } = require('openai');
const Lead = require('../models/Lead');
const MessageLog = require('../models/MessageLog');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Função auxiliar para classificar intenção e gerar a resposta
const generateAIResponseAndIntent = async (messageText, leadName) => {
  const prompt = `
Você é um SDR trabalhando no WhatsApp. Seu objetivo é qualificar leads de forma natural. 
Regras gerais:
- Responda de forma curtas (1 a 2 frases curtas no máximo), como mensagens de WhatsApp (sem hashtags ou formatações complexas).
- Seu tom é amigável e direto.

Fluxo Básico:
1. Se o cliente estiver respondendo à saudação inicial de forma positiva (ex: "pode sim", "diga", "fala ai", "bom dia"), envie uma explicação curta do produto e logo em seguida faça a pergunta de qualificação: "Você está procurando algo assim agora ou apenas pesquisando?".
2. Se o cliente responder à qualificação, você tomará uma decisão com base nas seguintes intenções:
  - [interessado] → Se o cliente quiser avançar/comprar/procurando agora. Ofereça um agendamento ou passe para um vendedor.
  - [curioso] → Se o cliente estiver apenas pesquisando. Envie mais informações genéricas e se coloque à disposição.
  - [nao_interessado] → Se o cliente disser que não quer. Agradeça o tempo dele.
  - [parar_contato] → Se o cliente pedir para parar de mandar mensagens, xingar, ou for hostil. Remova da lista.
  - [duvida] → Se ele fizer perguntas específicas sobre o produto, responda de forma breve e retorne à pergunta de qualificação se ainda não foi feita.
  - [mais_info] → Se ele pedir mais detalhes.

Analise a seguinte mensagem recebida pelo Lead (${leadName}): "${messageText}"

Como você classifica a intenção atual e qual a sua resposta?
Retorne SOMENTE no formato estrito abaixo, sem textos adicionais:
INTENT: [tag_exata_da_lista_acima]
REPLY: [sua resposta]
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ou gpt-3.5-turbo
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    const output = response.choices[0].message.content.trim();
    
    // Extraindo:
    const intentMatch = output.match(/INTENT:\s*\[?(.*?)\]?/);
    const replyMatch = output.match(/REPLY:\s*(.*)/s);

    const intent = intentMatch ? intentMatch[1].trim() : 'none';
    const reply = replyMatch ? replyMatch[1].trim() : 'Desculpe, não entendi.';

    return { intent, reply };

  } catch (error) {
    console.error("OpenAI API Error:", error);
    return { intent: 'none', reply: 'Estou com dificuldades técnicas no momento.' };
  }
};

const processIncomingMessage = async (client, msg) => {
  try {
    const userPhone = msg.from;
    const text = msg.body;
    
    // Check or Create Lead
    let lead = await Lead.findOne({ where: { phone: userPhone } });
    if (!lead) {
      lead = await Lead.create({ phone: userPhone, name: 'Lead ' + userPhone.split('@')[0], status: 'novo' });
    }
    
    // Delay simulando leitura
    await delay(1000 + Math.random() * 2000);

    console.log(`[AI Agent] Processing msg from ${userPhone}: ${text}`);
    
    // Get intent and reply from LLM
    const { intent, reply } = await generateAIResponseAndIntent(text, lead.name);

    // Update Lead state
    lead.intent = intent;
    lead.status = (intent === 'parar_contato' || intent === 'nao_interessado') ? 'nao_interessado' : 'respondeu';
    if(intent === 'interessado') lead.status = 'interessado';
    lead.last_message = text;
    await lead.save();

    // Log the user's message
    await MessageLog.create({ from: userPhone, to: 'SDR_System', content: text, is_ai: false });

    // Delay simulando digitação (tempo proporcional ao tamanho da resposta)
    const typingTime = typeof reply === 'string' ? reply.length * 50 : 2000;
    
    // Optional: send typing indicator state
    // await client.getChatById(userPhone).then(chat => chat.sendStateTyping());
    await delay(Math.min(typingTime, 5000)); // cap at 5s
    
    // Send response
    if (intent !== 'parar_contato' && intent !== 'nao_interessado') {
      await client.sendMessage(msg.from, reply);
      await MessageLog.create({ from: 'SDR_System', to: userPhone, content: reply, is_ai: true });
    } else {
        await client.sendMessage(msg.from, reply || 'Certo, não entrarei mais em contato.');
        await MessageLog.create({ from: 'SDR_System', to: userPhone, content: reply || 'Acknowledge stop', is_ai: true });
    }

  } catch (error) {
    console.error('Error in AI Service:', error);
  }
};

module.exports = {
  processIncomingMessage
};
