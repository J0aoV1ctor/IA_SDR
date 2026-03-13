'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Lead {
  id: number;
  name: string;
  phone: string;
  status: string;
  intent: string;
  last_message: string;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [isLinkingCampaign, setIsLinkingCampaign] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLeads();
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/campaigns');
      setCampaigns(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/leads');
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:5000/api/leads/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Upload completo!');
      fetchLeads();
    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload');
    }
    
    // reset
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddLead = async () => {
    if (!newLeadPhone) return alert('Telefone é obrigatório');
    try {
      await axios.post('http://localhost:5000/api/leads', {
        name: newLeadName,
        phone: newLeadPhone + '@c.us'
      });
      setIsAddingLead(false);
      setNewLeadName('');
      setNewLeadPhone('');
      fetchLeads();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar lead');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeads(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (id: number) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(lId => lId !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const handleLinkCampaign = async () => {
    if (!selectedCampaignId) return alert('Selecione uma campanha.');
    if (selectedLeads.length === 0) return alert('Selecione pelo menos um lead.');

    try {
      await axios.post('http://localhost:5000/api/leads/link-campaign', {
        leadIds: selectedLeads,
        campaignId: parseInt(selectedCampaignId)
      });
      alert('Leads vinculados com sucesso!');
      setIsLinkingCampaign(false);
      setSelectedLeads([]);
      setSelectedCampaignId('');
    } catch (err) {
      console.error(err);
      alert('Erro ao vincular campanha');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'novo': return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full">Novo</span>;
      case 'mensagem_enviada': return <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-600 rounded-full">Enviado</span>;
      case 'respondeu': return <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-100 text-indigo-600 rounded-full">Respondeu</span>;
      case 'interessado': return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-600 rounded-full">Interessado</span>;
      case 'nao_interessado': return <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-600 rounded-full">Ñ Interessado</span>;
      default: return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full">{status}</span>;
    }
  };

  const getIntentBadge = (intent: string) => {
    if (intent === 'none') return <span className="text-slate-400 text-sm">-</span>;
    if (['interessado', 'curioso', 'mais_info', 'duvida'].includes(intent)) {
      return <span className="text-emerald-500 font-medium text-sm capitalize">{intent}</span>;
    }
    return <span className="text-red-500 font-medium text-sm capitalize">{intent}</span>;
  };

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(search.toLowerCase()) || 
    l.phone.includes(search)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Leads</h1>
          <p className="text-slate-500 mt-1">Gerencie seus contatos e observe as qualificações.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {selectedLeads.length > 0 && (
            <button 
              onClick={() => setIsLinkingCampaign(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors shadow-sm animate-in fade-in"
            >
              Vincular Campanha ({selectedLeads.length})
            </button>
          )}
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <UploadCloud className="w-5 h-5 text-slate-400" />
            Importar CSV
          </button>
          <button 
            onClick={() => setIsAddingLead(!isAddingLead)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Novo Lead
          </button>
        </div>
      </div>

      {isAddingLead && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Adicionar Novo Lead</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
              <input 
                type="text" 
                value={newLeadName}
                onChange={e => setNewLeadName(e.target.value)}
                placeholder="Ex: Ana Souza"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone (DDD + Número)</label>
              <input 
                type="text" 
                value={newLeadPhone}
                onChange={e => setNewLeadPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 5511999999999"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={() => setIsAddingLead(false)}
              className="px-6 py-2.5 bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              Cancelar
            </button>
            <button 
              onClick={handleAddLead}
              className="px-6 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
            >
              Salvar Lead
            </button>
          </div>
        </div>
      )}

      {isLinkingCampaign && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-md animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Vincular Leads à Campanha</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              Você selecionou <strong>{selectedLeads.length} leads</strong>. Eles receberão a primeira mensagem desta campanha em breve.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione a Campanha</label>
              <select 
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="" disabled>Escolha uma campanha...</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsLinkingCampaign(false)}
                className="px-6 py-2.5 bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleLinkCampaign}
                disabled={!selectedCampaignId}
                className="px-6 py-2.5 bg-indigo-500 disabled:bg-indigo-300 text-white font-medium rounded-xl hover:bg-indigo-600 disabled:hover:bg-indigo-300 transition-colors shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou número..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Telefone</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Intenção IA</th>
                <th className="px-6 py-4 font-medium">Última Mensagem</th>
                <th className="px-6 py-4 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 w-full flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{lead.name || '---'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{lead.phone.split('@')[0]}</td>
                    <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                    <td className="px-6 py-4">{getIntentBadge(lead.intent)}</td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]" title={lead.last_message}>{lead.last_message || '---'}</td>
                    <td className="px-6 py-4 text-slate-500">{format(new Date(lead.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
