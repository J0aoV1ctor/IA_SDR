'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ConnectionPage() {
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<string>('pending'); // pending, auth, ready, disconnected

  useEffect(() => {
    // Connect to backend WebSocket
    const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000');

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('qr', (qr: string) => {
      setQrCode(qr);
      setStatus('pending');
    });

    socket.on('authenticated', () => {
      setStatus('auth');
      setQrCode('');
    });

    socket.on('ready', () => {
      setStatus('ready');
      setQrCode('');
    });

    socket.on('disconnected', () => {
      setStatus('disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col justify-center">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Conexão WhatsApp</h1>
        <p className="text-slate-500 mt-2">Vincule o número que atuará como SDR escaneando o QR Code.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-10 flex flex-col items-center max-w-md mx-auto w-full">
        {status === 'pending' && (
          <div className="w-full flex flex-col items-center space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
              {qrCode ? (
                <QRCodeSVG value={qrCode} size={256} className="rounded-xl shadow-sm bg-white p-2" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                  <div className="animate-pulse">Aguardando QR Code...</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <Smartphone className="w-5 h-5" />
              <span>Abra o WhatsApp e escaneie o código</span>
            </div>
          </div>
        )}

        {(status === 'auth' || status === 'ready') && (
          <div className="flex flex-col items-center space-y-4 text-emerald-500 py-10">
            <CheckCircle className="w-20 h-20 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Conectado com Sucesso!</h2>
            <p className="text-slate-500 text-center">Seu agente de IA agora pode processar mensagens e campanhas do WhatsApp.</p>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="flex flex-col items-center space-y-4 text-red-500 py-10">
            <AlertTriangle className="w-20 h-20 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Desconectado</h2>
            <p className="text-slate-500 text-center">A sessão foi encerrada. Reinicie o backend para gerar um novo QR Code.</p>
          </div>
        )}
      </div>
    </div>
  );
}
