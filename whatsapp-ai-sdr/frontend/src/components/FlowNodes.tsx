import { Handle, Position } from '@xyflow/react';

export function StartNode({ data }: any) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-xl bg-white border-2 border-emerald-500 min-w-[120px] text-center">
      <div className="font-black text-sm text-emerald-600 tracking-wider uppercase">🟢 Início</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-500" />
    </div>
  );
}

export function MessageNode({ data }: any) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-xl bg-white border-2 border-slate-200 w-56">
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <div className="font-bold text-sm mb-1 text-slate-800 flex items-center gap-2">
        <span>💬</span> Mensagem
      </div>
      <p className="text-xs text-slate-500 truncate">{data.message || 'Sem mensagem'}</p>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  );
}


export function WaitNode({ data }: any) {
  return (
    <div className="px-4 py-2 shadow-lg rounded-xl bg-amber-50 border-2 border-amber-400 w-32">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-amber-500" />
      <div className="font-bold text-sm text-center text-amber-800 flex items-center justify-center gap-1">
        <span>⏱️</span> {data.waitTime || 1}s
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-amber-500" />
    </div>
  );
}

export function WaitForReplyNode({ data }: any) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-xl bg-orange-50 border-2 border-orange-400 w-52 text-center">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
      <div className="font-bold text-sm text-orange-600 flex items-center justify-center gap-2 mb-1">
        <span>⏸️</span> Aguardar Interação
      </div>
      <p className="text-[10px] text-orange-500 leading-tight">Fluxo pausa até o cliente mandar uma nova mensagem.</p>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
    </div>
  );
}

export function ActionNode({ data }: any) {
  const isSuccess = data.actionType === 'success';
  return (
    <div className={`px-4 py-3 shadow-lg rounded-xl bg-white border-2 w-48 ${isSuccess ? 'border-indigo-500' : 'border-red-500'}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <div className={`font-bold text-sm ${isSuccess ? 'text-indigo-600' : 'text-red-500'} flex items-center gap-2`}>
        {isSuccess ? '✅ Convertido' : '❌ Arquivado'}
      </div>
      <Handle type="source" position={Position.Right} className={`w-3 h-3 ${isSuccess ? 'bg-indigo-500' : 'bg-red-500'}`} />
    </div>
  );
}

export function DecisionNode({ data }: any) {
  const conditions = data.conditions || ['sim', 'nao', 'qualquer'];
  return (
    <div className="pt-3 pb-6 pr-12 shadow-lg rounded-xl bg-slate-800 border-2 border-slate-700 w-64 text-white text-center shadow-xl">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-white" />
      
      <div className="px-4 mb-3">
        <div className="font-black text-sm mb-1 text-indigo-400">🤔 Decisão IA</div>
        <p className="text-xs text-slate-400 truncate" title={data.contextMessage}>Base: {data.contextMessage || 'Nenhum'}</p>
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-around border-l border-slate-700 py-2">
        {conditions.map((cond: string) => {
          return (
            <div key={cond} className="relative flex flex-col items-end w-full">
               <span className="text-[9px] uppercase font-bold text-slate-300 bg-slate-900 px-1 py-0.5 rounded shadow absolute -left-12 top-0 whitespace-nowrap">{cond}</span>
               <Handle 
                  type="source" 
                  position={Position.Right} 
                  id={cond} 
                  className="w-3 h-3 bg-indigo-500"
                  style={{ position: 'relative', right: '-4px', transform: 'none' }}
               />
            </div>
          );
        })}
      </div>
    </div>
  );
}
