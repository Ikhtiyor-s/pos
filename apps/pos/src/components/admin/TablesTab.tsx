import { useState } from 'react';
import { Plus, X, Users, Layers, Grid3X3, Edit3, QrCode, Trash2, Save, Loader2, Hash, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPrice, getStatusColor, getStatusLabel } from '../../lib/helpers';
import api from '../../services/api';
import type { TableData, ActiveOrderData } from '../../types';

interface TablesTabProps {
  tables: TableData[];
  activeOrders: ActiveOrderData[];
  onRefresh: () => void;
}

function tableStatusColor(s: string) {
  if (s === 'free') return 'bg-green-500';
  if (s === 'occupied') return 'bg-red-500';
  if (s === 'reserved') return 'bg-yellow-500';
  if (s === 'cleaning') return 'bg-blue-500';
  return 'bg-gray-400';
}

function tableStatusLabel(s: string) {
  if (s === 'free') return "Bo'sh";
  if (s === 'occupied') return 'Band';
  if (s === 'reserved') return 'Bron';
  if (s === 'cleaning') return 'Tozalanmoqda';
  return s;
}

function tableStatusBorder(s: string) {
  if (s === 'free') return 'border-green-200/60 bg-green-50/30 hover:border-green-300';
  if (s === 'occupied') return 'border-red-200/60 bg-red-50/30 hover:border-red-300';
  if (s === 'reserved') return 'border-yellow-200/60 bg-yellow-50/30 hover:border-yellow-300';
  if (s === 'cleaning') return 'border-blue-200/60 bg-blue-50/30 hover:border-blue-300';
  return 'border-gray-200/60 bg-gray-50/30';
}

function tableStatusTextColor(s: string) {
  if (s === 'free') return 'text-green-600';
  if (s === 'occupied') return 'text-red-500';
  if (s === 'reserved') return 'text-yellow-600';
  if (s === 'cleaning') return 'text-blue-600';
  return 'text-gray-600';
}

function statusBadge(status: string) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white', getStatusColor(status))}>
      {getStatusLabel(status)}
    </span>
  );
}

export default function TablesTab({ tables, activeOrders, onRefresh }: TablesTabProps) {
  const [floors, setFloors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('pos-floors') || '[]') || ['1-etaj', '2-etaj', 'Teras', 'VIP']; }
    catch { return ['1-etaj', '2-etaj', 'Teras', 'VIP']; }
  });
  const [selectedFloor, setSelectedFloor] = useState(floors[0] || '1-etaj');
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const [tableForm, setTableForm] = useState({ number: '', name: '', capacity: '4', floor: floors[0] || '1-etaj', status: 'free' });
  const [tableSaving, setTableSaving] = useState(false);
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');

  const floorMap: Record<string, string> = JSON.parse(localStorage.getItem('table-floors') || '{}');
  const getTableFloor = (t: TableData) => floorMap[t.id] || floors[0] || '1-etaj';
  const filteredTables = tables.filter((t) => getTableFloor(t) === selectedFloor);

  const saveTable = async () => {
    setTableSaving(true);
    try {
      const nameWithFloor = tableForm.name ? `${tableForm.floor}: ${tableForm.name}` : tableForm.floor;
      const payload = { number: parseInt(tableForm.number), name: nameWithFloor, capacity: parseInt(tableForm.capacity) || 4, qrCode: 'QR-' + tableForm.number };
      if (editingTable) {
        await api.put('/tables/' + editingTable.id, payload);
        localStorage.setItem('table-floors', JSON.stringify({ ...floorMap, [editingTable.id]: tableForm.floor }));
      } else {
        const { data } = await api.post('/tables', payload);
        const newId = data?.data?.id || data?.id;
        if (newId) localStorage.setItem('table-floors', JSON.stringify({ ...floorMap, [newId]: tableForm.floor }));
      }
      await onRefresh();
      setShowTableModal(false);
      setEditingTable(null);
      setTableForm({ number: '', name: '', capacity: '4', floor: selectedFloor, status: 'free' });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xatolik yuz berdi';
      alert(message);
    } finally {
      setTableSaving(false);
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm("Stolni o'chirmoqchimisiz?")) return;
    try {
      await api.delete('/tables/' + id);
      const updated = { ...floorMap };
      delete updated[id];
      localStorage.setItem('table-floors', JSON.stringify(updated));
      await onRefresh();
    } catch { alert("O'chirishda xatolik"); }
  };

  const openEditModal = (table: TableData) => {
    const floor = getTableFloor(table);
    const rawName = table.name?.startsWith(floor + ': ') ? table.name.slice(floor.length + 2) : (table.name === floor ? '' : table.name);
    setEditingTable(table);
    setTableForm({ number: String(table.number), name: rawName, capacity: String(table.capacity), floor, status: table.status });
    setShowTableModal(true);
  };

  const openNewModal = () => {
    setEditingTable(null);
    setTableForm({ number: '', name: '', capacity: '4', floor: selectedFloor, status: 'free' });
    setShowTableModal(true);
  };

  const addFloor = () => {
    const trimmed = newFloorName.trim();
    if (!trimmed || floors.includes(trimmed)) return;
    const updated = [...floors, trimmed];
    setFloors(updated);
    localStorage.setItem('pos-floors', JSON.stringify(updated));
    setNewFloorName('');
    setShowFloorModal(false);
    setSelectedFloor(trimmed);
  };

  const removeFloor = (floor: string) => {
    if (floors.length <= 1) return;
    if (!confirm(`"${floor}" etajini o'chirmoqchimisiz?`)) return;
    const updated = floors.filter((f) => f !== floor);
    setFloors(updated);
    localStorage.setItem('pos-floors', JSON.stringify(updated));
    if (selectedFloor === floor) setSelectedFloor(updated[0]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Stollar boshqaruvi</h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{tables.length} ta stol</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-xs">
            {(['free', 'occupied', 'reserved', 'cleaning'] as const).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', tableStatusColor(s))} />
                <span className="text-gray-600">{tableStatusLabel(s)} ({tables.filter((t) => t.status === s).length})</span>
              </div>
            ))}
          </div>
          <button onClick={openNewModal} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-[0.97]">
            <Plus size={16} /> Yangi stol
          </button>
        </div>
      </div>

      {/* Floor tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {floors.map((floor) => (
          <div key={floor} className="group relative flex-shrink-0">
            <button onClick={() => setSelectedFloor(floor)}
              className={cn('flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                selectedFloor === floor ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'glass-card border border-white/60 text-gray-700 hover:bg-white/80'
              )}>
              <Layers size={14} /> {floor}
              <span className={cn('ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold', selectedFloor === floor ? 'bg-white/25 text-white' : 'bg-gray-200/80 text-gray-600')}>
                {tables.filter((t) => getTableFloor(t) === floor).length}
              </span>
            </button>
            {floors.length > 1 && (
              <button onClick={() => removeFloor(floor)} className="absolute -top-1.5 -right-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] shadow group-hover:flex hover:bg-red-600">
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => setShowFloorModal(true)} className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-500 transition-all hover:border-orange-300 hover:text-orange-500 flex-shrink-0">
          <Plus size={14} /> Etaj qo'shish
        </button>
      </div>

      {/* Table grid */}
      {filteredTables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl glass-card border border-white/60 shadow-lg mb-4"><Grid3X3 className="h-12 w-12 text-gray-400" /></div>
          <p className="text-lg font-medium text-gray-700">Bu etajda stollar yo'q</p>
          <p className="text-sm text-gray-500 mb-4">"{selectedFloor}" uchun stol qo'shing</p>
          <button onClick={openNewModal} className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600">
            <Plus size={16} /> Stol qo'shish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredTables.map((table) => {
            const tableOrder = activeOrders.find((o) => o.tableId === table.id);
            const floor = getTableFloor(table);
            const displayName = table.name?.startsWith(floor + ': ') ? table.name.slice(floor.length + 2) : (table.name === floor ? '' : table.name);
            return (
              <div key={table.id} onClick={() => openEditModal(table)}
                className={cn('glass-card relative flex flex-col items-center justify-center rounded-2xl border-2 p-5 transition-all cursor-pointer group', tableStatusBorder(table.status))}>
                <span className={cn('absolute top-2 right-2 flex h-5 items-center rounded-full px-2 text-[10px] font-medium text-white', tableStatusColor(table.status))}>
                  {tableStatusLabel(table.status)}
                </span>
                <span className={cn('text-3xl font-bold mt-2', tableStatusTextColor(table.status))}>#{table.number}</span>
                {displayName && <span className="text-xs text-gray-500 mt-1 truncate max-w-full px-1">{displayName}</span>}
                <span className="text-sm text-gray-600 flex items-center gap-1 mt-1.5"><Users size={12} />{table.capacity} kishi</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-1"><Layers size={10} />{floor}</span>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400"><QrCode size={10} />QR-{table.number}</div>
                {tableOrder && (
                  <div className="mt-2 text-center">
                    <p className="text-xs font-semibold text-orange-500">{formatPrice(tableOrder.total)}</p>
                    {statusBadge(tableOrder.status)}
                  </div>
                )}
                <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={12} className="text-gray-400" /></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-white/60 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">{editingTable ? `Stol #${editingTable.number} tahrirlash` : "Yangi stol qo'shish"}</h3>
              <button onClick={() => { setShowTableModal(false); setEditingTable(null); }} className="rounded-xl p-2 hover:bg-gray-100 transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Stol raqami *</label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" value={tableForm.number} onChange={(e) => setTableForm((f) => ({ ...f, number: e.target.value }))} placeholder="1" className="w-full rounded-xl border border-gray-200 bg-white/80 py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Stol nomi (ixtiyoriy)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={tableForm.name} onChange={(e) => setTableForm((f) => ({ ...f, name: e.target.value }))} placeholder="Deraza yoni, Bog' ichida..." className="w-full rounded-xl border border-gray-200 bg-white/80 py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Sig'imi (kishi soni)</label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" value={tableForm.capacity} onChange={(e) => setTableForm((f) => ({ ...f, capacity: e.target.value }))} min="1" max="50" className="w-full rounded-xl border border-gray-200 bg-white/80 py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Etaj / Zona</label>
                <div className="relative">
                  <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select value={tableForm.floor} onChange={(e) => setTableForm((f) => ({ ...f, floor: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white/80 py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 appearance-none">
                    {floors.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              {tableForm.number && (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 p-3">
                  <QrCode size={32} className="text-gray-600 flex-shrink-0" />
                  <div><p className="text-xs font-medium text-gray-700">QR kod</p><p className="text-sm text-gray-500 font-mono">QR-{tableForm.number}</p></div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-6">
              {editingTable && (
                <button onClick={() => { deleteTable(editingTable.id); setShowTableModal(false); setEditingTable(null); }} className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} /> O'chirish
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => { setShowTableModal(false); setEditingTable(null); }} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Bekor</button>
              <button onClick={saveTable} disabled={!tableForm.number || tableSaving} className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {tableSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingTable ? 'Saqlash' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Floor Modal */}
      {showFloorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm rounded-3xl border border-white/60 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Yangi etaj qo'shish</h3>
              <button onClick={() => setShowFloorModal(false)} className="rounded-xl p-2 hover:bg-gray-100 transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Etaj nomi</label>
              <div className="relative">
                <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={newFloorName} onChange={(e) => setNewFloorName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFloor()} placeholder="3-etaj, Hovuz yoni..." className="w-full rounded-xl border border-gray-200 bg-white/80 py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" autoFocus />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <button onClick={() => setShowFloorModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Bekor</button>
              <button onClick={addFloor} disabled={!newFloorName.trim()} className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-50 transition-all">Qo'shish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
