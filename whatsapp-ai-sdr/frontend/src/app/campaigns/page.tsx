'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface Campaign {
  id: number;
  name: string;
  script: string;
  status: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [newCampScript, setNewCampScript] = useState('Olá {nome}, tudo bem? Aqui é ...');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/campaigns');
      setCampaigns(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!newCampName) return alert('Dê um nome a campanha');
    try {
      await axios.post('http://localhost:5000/api/campaigns', {
        name: newCampName,
        script: newCampScript
      });
      setIsCreating(false);
      setNewCampName('');
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar campanha');
    }
  };

  const handleAction = async (id: number, action: 'start' | 'pause') => {
    try {
      await axios.post(`http://localhost:5000/api/campaigns/${id}/${action}`);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Erro ao executar ação');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Campanhas</h1>
          <p className="text-slate-500 mt-1">Crie os scripts de abordagem para enviar aos novos leads.</p>
        </div>
        
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
        >
          {isCreating ? 'Cancelar' : 'Nova Campanha'}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Criar Campanha</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Campanha</label>
              <input 
                type="text" 
                value={newCampName}
                onChange={e => setNewCampName(e.target.value)}
                placeholder="Ex: Black Friday 2026"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Script Inicial <span className="text-slate-400 text-xs ml-2">(Use {'{nome}'} como variável)</span>
              </label>
              <textarea 
                rows={5}
                value={newCampScript}
                onChange={e => setNewCampScript(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button 
                onClick={createCampaign}
                className="px-6 py-2.5 bg-slate-900 dark:bg-emerald-600 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
              >
                Salvar Campanha
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300">
            Nenhuma campanha criada ainda.
          </div>
        ) : (
          campaigns.map(camp => (
            <div key={camp.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1" title={camp.name}>{camp.name}</h3>
                {camp.status === 'ativa' && <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md text-xs font-bold animate-pulse">ATIVA</span>}
                {camp.status === 'pausada' && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold">PAUSADA</span>}
                {camp.status === 'concluida' && <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-md text-xs font-bold">CONCLUÍDA</span>}
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex-1 mb-6 relative group">
                <FileText className="absolute top-4 right-4 text-slate-200 dark:text-slate-700 w-12 h-12 opacity-50 pointer-events-none group-hover:opacity-10 transition-opacity" />
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-5 whitespace-pre-wrap">{camp.script}</p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="text-xs text-slate-400">
                  Criado em {format(new Date(camp.createdAt), 'dd/MM/yyyy')}
                </div>
                
                <div className="flex gap-2">
                  {camp.status !== 'ativa' && camp.status !== 'concluida' && (
                    <button 
                      onClick={() => handleAction(camp.id, 'start')}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Iniciar Envios"
                    >
                      <Play className="w-5 h-5 fill-current" />
                    </button>
                  )}
                  {camp.status === 'ativa' && (
                    <button 
                      onClick={() => handleAction(camp.id, 'pause')}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Pausar Envios"
                    >
                      <Pause className="w-5 h-5 fill-current" />
                    </button>
                  )}
                  {camp.status === 'concluida' && (
                    <div className="p-2 text-blue-500">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
