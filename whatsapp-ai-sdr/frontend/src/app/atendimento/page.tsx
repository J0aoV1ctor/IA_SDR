'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  Node,
  Edge,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Plus, Save, X, Activity, MessageSquare, Brain, Clock, Settings, Trash2, Edit2 } from 'lucide-react';
import { StartNode, MessageNode, WaitNode, ActionNode, DecisionNode, WaitForReplyNode } from '@/components/FlowNodes';

const nodeTypes = {
  startNode: StartNode,
  messageNode: MessageNode,
  waitNode: WaitNode,
  actionNode: ActionNode,
  decisionNode: DecisionNode,
  waitForReplyNode: WaitForReplyNode,
};

// Initial nodes if none provided
const initialNodes: Node[] = [
  { id: 'start_1', type: 'startNode', position: { x: 250, y: 50 }, data: {} },
];
const initialEdges: Edge[] = [];

export default function AtendimentoDesignerPage() {
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentFlowId, setCurrentFlowId] = useState<number | null>(null);
  const [flowName, setFlowName] = useState('');
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Selected Node Side Panel
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/flows');
      setFlows(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEditor = (flow?: any) => {
    if (flow) {
      setCurrentFlowId(flow.id);
      setFlowName(flow.name);
      if (flow.nodes && flow.nodes.reactFlowNodes) {
         setNodes(flow.nodes.reactFlowNodes);
         setEdges(flow.nodes.reactFlowEdges || []);
      } else {
         setNodes(initialNodes);
         setEdges(initialEdges);
      }
    } else {
      setCurrentFlowId(null);
      setFlowName('');
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
    setIsEditing(true);
    setSelectedNode(null);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setSelectedNode(null);
  };

  const handleSave = async () => {
    if (!flowName.trim()) return alert('O fluxo precisa de um nome!');
    const payload = {
      name: flowName,
      nodes: {
        reactFlowNodes: nodes,
        reactFlowEdges: edges
      }
    };

    try {
      if (currentFlowId) {
        await axios.put(`http://localhost:5000/api/flows/${currentFlowId}`, payload);
        alert('Fluxo atualizado!');
      } else {
        await axios.post('http://localhost:5000/api/flows', payload);
        alert('Fluxo criado!');
      }
      closeEditor();
      fetchFlows();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar fluxo.');
    }
  };

  const handleDeleteFlow = async (id: number) => {
    if (!window.confirm('Certeza que deseja apagar?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/flows/${id}`);
      fetchFlows();
    } catch (err) {
      console.error(err);
    }
  };

  // React Flow Handlers
  const duplicateSelectedNode = () => {
    if (!selectedNode) return;
    const clonedNode = {
       ...selectedNode,
       id: `${selectedNode.type}_copy_${Date.now()}`,
       selected: false,
       position: { x: selectedNode.position.x + 50, y: selectedNode.position.y + 100 }
    };
    setNodes(nds => [...nds, clonedNode]);
    setSelectedNode(null);
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'default', animated: true }, eds)),
    [setEdges]
  );


  const onNodesChangeHandler = useCallback((changes: any) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);

  const onEdgesChangeHandler = useCallback((changes: any) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [setEdges]);

  const onNodeClick = (event: any, node: Node) => {
    setSelectedNode(node);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };

  // Utility to drag'n'drop add new nodes
  const addNodeToPanel = (type: string) => {
    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: {}
    };

    if (type === 'decisionNode') {
      newNode.data = { conditions: ['sim', 'não', 'qualquer'], contextMessage: '' };
    } else if (type === 'messageNode') {
      newNode.data = { message: '' };
    } else if (type === 'waitNode') {
      newNode.data = { waitTime: 5 };
    } else if (type === 'waitForReplyNode') {
      newNode.data = {};
    } else if (type === 'actionNode') {
      newNode.data = { actionType: 'success' };
    }

    setNodes((nds) => nds.concat(newNode));
  };

  const updateNodeData = (id: string, field: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, [field]: value };
        }
        return node;
      })
    );
    // update local selected state so UI refreshes immediately
    if (selectedNode && selectedNode.id === id) {
        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, [field]: value } });
    }
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };


  if (!isEditing) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Fluxos de Atendimento</h1>
            <p className="text-slate-500 mt-1">Crie lógicas de automação visual para qualificar leads via WhatsApp.</p>
          </div>
          <button 
            onClick={() => startEditor()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Novo Fluxo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-10">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : flows.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-500 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800">
              Você ainda não possui nenhum fluxo de atendimento. 
            </div>
          ) : (
            flows.map(flow => (
              <div key={flow.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEditor(flow)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteFlow(flow.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{flow.name}</h3>
                <div className="text-xs text-slate-400">ID: {flow.id}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Visual Editor Layout
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Navbar */}
      <div className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 z-10">
        <div className="flex flex-1 items-center">
            <input 
               type="text" 
               value={flowName} 
               onChange={e => setFlowName(e.target.value)}
               placeholder="Nome do Fluxo..."
               className="text-lg font-bold bg-transparent outline-none text-slate-800 dark:text-white placeholder:text-slate-300 min-w-[300px]"
            />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={closeEditor} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Voltar</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg shadow-sm">
            <Save className="w-4 h-4" /> Salvar Visual
          </button>
        </div>
      </div>

      {/* Main Designer Area */}
      <div className="flex flex-1 relative bg-slate-50 dark:bg-slate-950">
        
        {/* Left Toolbar for Nodes */}
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 z-10 shadow-lg">
           <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
           <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Adicionar Tarefa/Etapa</h3>
           <p className="text-xs text-slate-500">Arraste ou clique numa tarefa para adicionar ao fluxograma atual.</p>
         </div>
           
           <button onClick={() => addNodeToPanel('messageNode')} className="flex items-center gap-3 p-3 text-left border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              <div>
                 <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Mensagem</div>
                 <div className="text-[10px] text-slate-500">Enviar texto para lead</div>
              </div>
           </button>

           <button onClick={() => addNodeToPanel('decisionNode')} className="flex items-center gap-3 p-3 text-left border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
              <Brain className="w-5 h-5 text-emerald-500" />
              <div>
                 <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Decisão IA</div>
                 <div className="text-[10px] text-slate-500">Avalia resposta (sim/não)</div>
              </div>
           </button>

           <button onClick={() => addNodeToPanel('waitNode')} className="flex items-center gap-3 p-3 text-left border border-slate-200 dark:border-slate-700 rounded-xl hover:border-amber-400 hover:bg-amber-50/50 transition-colors">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                 <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Espera</div>
                 <div className="text-[10px] text-slate-500">Atraso temporal</div>
              </div>
           </button>

           <button onClick={() => addNodeToPanel('actionNode')} className="flex items-center gap-3 p-3 text-left border border-slate-200 dark:border-slate-700 rounded-xl hover:border-red-400 hover:bg-red-50/50 transition-colors">
              <Settings className="w-5 h-5 text-red-500" />
              <div>
                 <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Ação Final</div>
                 <div className="text-[10px] text-slate-500">Converte ou encerra</div>
              </div>
           </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
           <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChangeHandler}
              onEdgesChange={onEdgesChangeHandler}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-slate-50 dark:bg-slate-900"
              defaultEdgeOptions={{ type: 'default', animated: true }}
           >
             <Background color="#cbd5e1" gap={16} />
             <Controls />
           </ReactFlow>
        </div>

        {/* Right Sidebar for Selected Node Edit */}
        {selectedNode && (
          <div className="w-72 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-xl flex flex-col z-20 absolute right-0 top-0 bottom-0 animate-in slide-in-from-right-8">
           <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
             <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
               <Settings className="w-4 h-4 text-indigo-500" />
               Propriedades da Tarefa
             </h3>
             <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">
               <X className="w-5 h-5" />
             </button>
           </div>
             
             <div className="p-4 flex-1 overflow-y-auto">
               {selectedNode.type === 'messageNode' && (
                 <div className="space-y-4">
                   <label className="block text-sm font-bold text-slate-700">Texto da Mensagem</label>
                   <textarea
                     value={selectedNode.data.message as string || ''}
                     onChange={e => updateNodeData(selectedNode.id, 'message', e.target.value)}
                     rows={5}
                     placeholder="Olá {nome}!"
                     className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
                   />
                 </div>
               )}

               {selectedNode.type === 'decisionNode' && (
                 <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Contexto p/ IA entender</label>
                      <input
                        type="text"
                        value={selectedNode.data.contextMessage as string || ''}
                        onChange={e => updateNodeData(selectedNode.id, 'contextMessage', e.target.value)}
                        placeholder="Ex: Perguntei se quer agendar..."
                        className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
                      />
                   </div>
                   
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Canais / Respostas esperadas (Vírgula)</label>
                      <input
                        type="text"
                        value={((selectedNode.data.conditions as string[]) || []).join(', ')}
                        onChange={(e) => {
                           const arr = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                           updateNodeData(selectedNode.id, 'conditions', arr);
                        }}
                        className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
                      />
                      <p className="text-xs text-slate-400 mt-2">Isto gerará os 'pontos' de saída embaixo do bloco no painel central para você ligar a próxima etapa.</p>
                   </div>
                 </div>
               )}

               {selectedNode.type === 'waitNode' && (
                 <div className="space-y-4">
                   <label className="block text-sm font-bold text-slate-700">Segundos (Atraso)</label>
                   <input
                     type="number"
                     value={selectedNode.data.waitTime as number || 0}
                     onChange={e => updateNodeData(selectedNode.id, 'waitTime', parseInt(e.target.value))}
                     className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
                   />
                 </div>
               )}

               {selectedNode.type === 'actionNode' && (
                 <div className="space-y-4">
                   <label className="block text-sm font-bold text-slate-700">Ação no Lead</label>
                   <select
                     value={selectedNode.data.actionType as string || 'success'}
                     onChange={e => updateNodeData(selectedNode.id, 'actionType', e.target.value)}
                     className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
                   >
                     <option value="success">✅ Marcar como Convertido</option>
                     <option value="fail">❌ Marcar Não Interessado / Arquivar</option>
                   </select>
                 </div>
               )}
               
               <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col gap-2">
                  <button onClick={duplicateSelectedNode} className="flex items-center gap-2 text-slate-700 font-bold hover:bg-slate-100 border border-slate-200 w-full p-2 rounded justify-center shadow-sm">
                    <Edit2 className="w-4 h-4" /> Duplicar Tarefa
                  </button>
                  <button onClick={handleDeleteSelectedNode} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 w-full p-2 rounded justify-center">
                    <Trash2 className="w-4 h-4" /> Apagar Tarefa
                  </button>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}


