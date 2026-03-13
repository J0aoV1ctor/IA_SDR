'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, MessagesSquare, Percent, CheckCircle, Activity } from 'lucide-react';

interface Metrics {
  total_leads: number;
  mensagens_enviadas: number;
  taxa_resposta: number;
  leads_interessados: number;
  conversoes: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard/metrics');
      setMetrics(res.data);
    } catch (error) {
      console.error('Error fetching metrics', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { title: 'Total Leads', value: metrics?.total_leads || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Mensagens IA', value: metrics?.mensagens_enviadas || 0, icon: MessagesSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Taxa Resposta', value: `${metrics?.taxa_resposta || 0}%`, icon: Percent, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Interessados', value: metrics?.leads_interessados || 0, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Conversões', value: metrics?.conversoes || 0, icon: CheckCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Dashboard do Agente SDR</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Visão geral do desempenho das campanhas automáticas de WhatsApp.</p>
      </div>

      {loading && !metrics ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {cards.map((card, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Todo: Real-time Message Feed */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Atividade Recente</h2>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 flex items-center justify-center min-h-[300px]">
           <p className="text-slate-400">O feed de mensagens ao vivo será exibido aqui...</p>
        </div>
      </div>
    </div>
  );
}
