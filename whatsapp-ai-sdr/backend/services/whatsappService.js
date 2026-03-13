const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const aiService = require('./aiService'); // to be implemented

let client;
let ioInstance;

const initWhatsApp = (io) => {
  ioInstance = io;

  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'sdr-client' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
  });

  client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('Use seu WhatsApp para escanear o QR Code abaixo:');
    qrcode.generate(qr, { small: true });
    
    // Broadcast qr code to frontend so it can be displayed
    if (ioInstance) {
      ioInstance.emit('qr', qr);
    }
  });

  client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    if (ioInstance) {
      ioInstance.emit('ready', { status: 'ready' });
    }
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Authenticated');
    if (ioInstance) {
      ioInstance.emit('authenticated', { status: 'authenticated' });
    }
  });

  client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    if (ioInstance) {
      ioInstance.emit('auth_failure', { status: 'failure', message: msg });
    }
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp Disconnected:', reason);
    if (ioInstance) {
      ioInstance.emit('disconnected', { status: 'disconnected', reason });
    }
    // Automatically reinitialize or notify user depending on strategy.
  });

  client.on('message', async (msg) => {
    // Handle incoming messages
    if (msg.from === 'status@broadcast') return;

    console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);

    // Call the AI Service to process the message and intent
    if (aiService && aiService.processIncomingMessage) {
      await aiService.processIncomingMessage(client, msg);
    }
  });

  client.initialize();
};

const getClient = () => client;

module.exports = {
  initWhatsApp,
  getClient
};
