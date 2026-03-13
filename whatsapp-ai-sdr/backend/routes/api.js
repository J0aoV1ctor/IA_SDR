const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const stream = require('stream');
const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const MessageLog = require('../models/MessageLog');
const LeadCampaign = require('../models/LeadCampaign');
const { getClient } = require('../services/whatsappService');

const upload = multer({ storage: multer.memoryStorage() });

// Helper para formatar números (especialmente do Brasil)
function formatWhatsAppNumber(phone) {
  let cleanPhone = phone.replace(/\D/g, '');
  // Adiciona o DDI do Brasil (55) se o número tiver 10 ou 11 dígitos (DDD + Número)
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
  }
  return `${cleanPhone}@c.us`;
}

// --- WhatsApp Status ---
router.get('/whatsapp/status', (req, res) => {
  const client = getClient();
  if (!client) {
    return res.json({ status: 'disconnected' });
  }
  
  // A simplistic way to check info (wa js might expose a better state)
  const state = client.info ? 'authenticated' : 'pending';
  res.json({ status: state });
});

router.get('/leads', async (req, res) => {
  try {
    const leads = await Lead.findAll({ order: [['createdAt', 'DESC']] });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const formattedPhone = formatWhatsAppNumber(phone);
    const lead = await Lead.create({ name, phone: formattedPhone });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/leads/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);

  bufferStream
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        let count = 0;
        for (let row of results) {
          // Expected CSV format: name, phone
          const phone = row.phone || row.telefone || row.Phone || row.Telefone;
          const name = row.name || row.nome || row.Name || row.Nome;
          if (phone) {
            const formattedPhone = formatWhatsAppNumber(phone);
            const exists = await Lead.findOne({ where: { phone: formattedPhone } });
            if (!exists) {
              await Lead.create({ phone: formattedPhone, name: name || 'Lead Importado' });
              count++;
            }
          }
        }
        res.json({ message: `${count} leads imported successfully` });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
});

router.post('/leads/link-campaign', async (req, res) => {
  try {
    const { leadIds, campaignId } = req.body;
    if (!leadIds || !campaignId) {
      return res.status(400).json({ error: 'leadIds and campaignId are required' });
    }
    
    // Check if campaign exists
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    let linkedCount = 0;
    for (let leadId of leadIds) {
      const [link, created] = await LeadCampaign.findOrCreate({
        where: { lead_id: leadId, campaign_id: campaignId },
        defaults: { status: 'pendente' }
      });
      if (created) linkedCount++;
    }

    res.json({ message: `${linkedCount} leads successfully linked to campaign ${campaign.name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({ order: [['createdAt', 'DESC']] });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const { name, script } = req.body;
    const campaign = await Campaign.create({ name, script });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// A simple implementation of Campaign Start
router.post('/campaigns/:id/start', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    
    // Set status to active
    campaign.status = 'ativa';
    await campaign.save();

    // In a real scenario, here we would schedule jobs (e.g., using Bull/Redis) 
    // to iterate over all "novo" leads and send the campaign script.
    // For this prototype, we'll just return success and simulate kicking it off.
    
    const client = getClient();
    if (client) {
        console.log(`\n================================`);
        console.log(`▶️ STARTING CAMPAIGN IN BACKGROUND`);
        console.log(`Campaign ID: ${campaign.id} | Name: ${campaign.name}`);
        console.log(`================================`);
        // Kick off background sending to associated leads
        // Note: Not awaiting here to let the request return immediately
        sendCampaignInBackground(campaign, client).catch(console.error);
    } else {
        console.error('[Campaign] Cannot start campaign because WhatsApp client is completely disconnected.');
    }

    res.json({ message: 'Campaign started and running in background', campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/pause', async (req, res) => {
    try {
        const campaign = await Campaign.findByPk(req.params.id);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        campaign.status = 'pausada';
        await campaign.save();
        res.json({ message: 'Campaign paused', campaign });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Background sender for campaigns (Simulator) ---
async function sendCampaignInBackground(campaign, client) {
    // Fetch leads linked to this campaign that haven't received it yet
    const pendingLinks = await LeadCampaign.findAll({ 
        where: { campaign_id: campaign.id, status: 'pendente' }, 
        limit: 50,
        include: [Lead]
    });
    
    for(let link of pendingLinks) {
        const lead = link.Lead;
        // Check if campaign is paused midway
        const curCamp = await Campaign.findByPk(campaign.id);
        if(curCamp.status !== 'ativa') {
            console.log('Campaign paused, stopping background sender');
            break;
        }

        try {
            // Replace variables on script
            let message = campaign.script.replace(/{nome}/gi, lead.name || 'amigo(a)');
            
            console.log(`\n⏳ Preparando para enviar mensagem para ${lead.name || 'Amigo'} (${lead.phone})...`);
            
            // Random delay between sends (e.g., 3s to 8s) to avoid ban
            const delay = 3000 + Math.random() * 5000;
            console.log(`⏱️ Aguardando ${Math.round(delay/1000)} segundos (human delay)...`);
            await new Promise(r => setTimeout(r, delay));

            // Ensure correct format for whatsapp-web.js (must end with @c.us)
            let phoneId = formatWhatsAppNumber(lead.phone);

            // Verify if the number is registered on WhatsApp (optional but recommended)
            // const numberDetails = await client.getNumberId(phoneId);
            // if (!numberDetails) throw new Error('O número não está registrado no WhatsApp');

            if (!client.info) {
               throw new Error('O WhatsApp ainda não está 100% conectado ou sincronizado. Aguarde alguns segundos.');
            }

            await client.sendMessage(phoneId, message);
            
            // Update tracking
            lead.status = 'mensagem_enviada';
            await lead.save();
            
            link.status = 'enviada';
            await link.save();

            await MessageLog.create({
                from: 'SDR_System',
                to: phoneId,
                content: message,
                campaign_id: campaign.id,
                is_ai: true
            });
            console.log(`✅ Sucesso! Mensagem enviada para: ${phoneId}`);
            console.log(`Texto enviado: "${message}"`);
        } catch(err) {
            console.error(`❌ Erro ao enviar mensagem para ${lead.phone}: `, err.message);
        }
    }
    
    // Finish campaign if all sent
    const curCampFinal = await Campaign.findByPk(campaign.id);
    if(curCampFinal && curCampFinal.status === 'ativa') {
        const remaining = await LeadCampaign.count({ where: { campaign_id: campaign.id, status: 'pendente' } });
        if(remaining === 0) {
            curCampFinal.status = 'concluida';
            await curCampFinal.save();
            console.log(`\n🎉 CAMPAIGN COMPLETED: Todas as mensagens da campanha foram enviadas!`);
        }
    }
}

// --- Dashboard Metrics ---
router.get('/dashboard/metrics', async (req, res) => {
  try {
    const total_leads = await Lead.count();
    const leads_interessados = await Lead.count({ where: { intent: 'interessado' } });
    const conversoes = await Lead.count({ where: { status: 'convertido' } });
    const mensagens_enviadas = await MessageLog.count({ where: { is_ai: true } });
    
    // Taxa de resposta: Leads que responderam (status não é novo, nem mensagem_enviada) / Total contatado
    const { Op } = require('sequelize');
    const leadsContatados = await Lead.count({ where: { status: { [Op.ne]: 'novo' } } });
    const leadsResponderam = await Lead.count({ where: { status: { [Op.in]: ['respondeu', 'interessado', 'nao_interessado', 'convertido'] } } });
    
    let taxa_resposta = 0;
    if(leadsContatados > 0) {
        taxa_resposta = Math.round((leadsResponderam / leadsContatados) * 100);
    }

    res.json({
      total_leads,
      mensagens_enviadas,
      taxa_resposta,
      leads_interessados,
      conversoes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
