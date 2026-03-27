const { OpenAI } = require('openai');
const Lead = require('../models/Lead');
const MessageLog = require('../models/MessageLog');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateAIResponseAndIntent = async (messageText, leadName, contextMessage, expectedConditions = []) => {
  const optionsList = expectedConditions.length > 0 
    ? expectedConditions.map(c => `- [${c}]`).join('\n')
    : `- [sim]\n- [não]\n- [duvida]\n- [interessado]\n- [parar]\n- [outro]`;

  const prompt = `
Você é um sistema inteligente trabalhando como SDR no WhatsApp.
Sua função é ler a mensagem do cliente e classificar a "intenção" dele com base no contexto atual e nas opções permitidas.

Contexto (pergunta/mensagem anterior enviada ao cliente): 
"${contextMessage || 'Nenhum'}"

Mensagem do cliente (${leadName}): 
"${messageText}"

Classifique a intenção do cliente, escolhendo a que tiver maior similaridade semântica com UMA destas opções obrigatórias:
${optionsList}

Retorne SOMENTE a palavra escolhida no formato exato: INTENT: [tag]
Exemplo: se você escolheu "sim", retorne: INTENT: [sim]
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3,
      max_tokens: 20,
    });

    const output = response.choices[0].message.content.trim();
    const intentMatch = output.match(/INTENT:\s*\[?(.*?)\]?/i);
    const intent = intentMatch ? intentMatch[1].trim().toLowerCase() : 'outro';
    return { intent };
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return { intent: 'outro' };
  }
};


async function executeFlowNode(lead, flow, currentNodeId, client) {
   let currentId = currentNodeId;
   let flowData = flow.nodes; // { reactFlowNodes: [], reactFlowEdges: [] }
   if (Array.isArray(flowData)) {
       // compatibilidade reversa pra arrays antigos de outro formato se existir
       flowData = { reactFlowNodes: [], reactFlowEdges: [] };
   }

   // Safety counter to prevent infinite loops
   let steps = 0;

   while (currentId && steps < 50) {
      steps++;
      const node = flowData.reactFlowNodes.find(n => n.id === currentId);
      if (!node) break;

      console.log(`[Flow Engine] Executing Node ${node.id} (${node.type}) for Lead ${lead.phone}`);

      if (node.type === 'messageNode') {
         let msg = (node.data.message || '').replace(/{nome}/gi, lead.name || 'amigo(a)');
         if (msg.trim()) {
            await delay(1000 + (msg.length * 20)); // simulated typing
            await client.sendMessage(lead.phone, msg);
            await MessageLog.create({ from: 'SDR_System', to: lead.phone, content: msg, flow_id: flow.id, is_ai: true });
         }
         
         const nextEdge = flowData.reactFlowEdges.find(e => e.source === currentId);
         currentId = nextEdge ? nextEdge.target : null;
      }
      else if (node.type === 'waitNode') {
         const s = parseInt(node.data.waitTime || 1);
         console.log(`[Flow Engine] Waiting ${s} seconds for Lead ${lead.phone}`);
         await delay(s * 1000);
         
         const nextEdge = flowData.reactFlowEdges.find(e => e.source === currentId);
         currentId = nextEdge ? nextEdge.target : null;
      }
      else if (node.type === 'decisionNode' || node.type === 'waitForReplyNode') {
         // PAUSE EXECUTION - wait for human reply!
         lead.active_flow_node_id = currentId;
         await lead.save();
         console.log(`[Flow Engine] Paused at ${node.type} ${currentId} for Lead ${lead.phone}`);
         return; 
      }
      else if (node.type === 'actionNode') {
         lead.status = node.data.actionType === 'success' ? 'convertido' : 'nao_interessado';
         await lead.save();
         const nextEdge = flowData.reactFlowEdges.find(e => e.source === currentId);
         currentId = nextEdge ? nextEdge.target : null;
      }
      else if (node.type === 'startNode') {
         const nextEdge = flowData.reactFlowEdges.find(e => e.source === currentId);
         currentId = nextEdge ? nextEdge.target : null;
      }
      else {
         // unknown node
         const nextEdge = flowData.reactFlowEdges.find(e => e.source === currentId);
         currentId = nextEdge ? nextEdge.target : null;
      }
   }
   
   // End of flow reached
   if (!currentId) {
      console.log(`[Flow Engine] Flow Ended for Lead ${lead.phone}`);
      lead.active_flow_id = null;
      lead.active_flow_node_id = null;
      await lead.save();
   }
}

module.exports = {
  executeFlowNode,
  generateAIResponseAndIntent
};
