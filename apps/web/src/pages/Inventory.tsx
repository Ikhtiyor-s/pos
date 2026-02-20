import { useState } from 'react';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Edit,
  Trash2,
  History,
  Download,
  Upload,
  ScanLine,
  CheckCircle,
  Loader2,
  X,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QRScannerModal } from '@/components/QRScannerModal';
import { productApiService } from '@/services/product.service';
import { inventoryApiService } from '@/services/inventory.service';

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  costPrice: number;
  supplier: string;
  lastUpdated: string;
  status: StockStatus;
}

const mockInventory: InventoryItem[] = [
  { id: '1', name: 'Guruch', sku: 'INV-001', category: 'Donlar', quantity: 150, unit: 'kg', minStock: 50, costPrice: 12000, supplier: 'Agro Trade', lastUpdated: '2024-01-05', status: 'IN_STOCK' },
  { id: '2', name: 'Go\'sht (mol)', sku: 'INV-002', category: 'Go\'sht', quantity: 25, unit: 'kg', minStock: 30, costPrice: 85000, supplier: 'Meat House', lastUpdated: '2024-01-06', status: 'LOW_STOCK' },
  { id: '3', name: 'Piyoz', sku: 'INV-003', category: 'Sabzavotlar', quantity: 80, unit: 'kg', minStock: 20, costPrice: 5000, supplier: 'Fresh Veggies', lastUpdated: '2024-01-06', status: 'IN_STOCK' },
  { id: '4', name: 'Sabzi', sku: 'INV-004', category: 'Sabzavotlar', quantity: 0, unit: 'kg', minStock: 15, costPrice: 8000, supplier: 'Fresh Veggies', lastUpdated: '2024-01-04', status: 'OUT_OF_STOCK' },
  { id: '5', name: 'Un', sku: 'INV-005', category: 'Donlar', quantity: 200, unit: 'kg', minStock: 100, costPrice: 7000, supplier: 'Agro Trade', lastUpdated: '2024-01-05', status: 'IN_STOCK' },
  { id: '6', name: 'Yog\' (o\'simlik)', sku: 'INV-006', category: 'Moylar', quantity: 45, unit: 'litr', minStock: 20, costPrice: 22000, supplier: 'Oil Plus', lastUpdated: '2024-01-06', status: 'IN_STOCK' },
  { id: '7', name: 'Tuz', sku: 'INV-007', category: 'Ziravorlar', quantity: 10, unit: 'kg', minStock: 15, costPrice: 3000, supplier: 'Spice World', lastUpdated: '2024-01-03', status: 'LOW_STOCK' },
  { id: '8', name: 'Qora murch', sku: 'INV-008', category: 'Ziravorlar', quantity: 0, unit: 'kg', minStock: 2, costPrice: 45000, supplier: 'Spice World', lastUpdated: '2024-01-02', status: 'OUT_OF_STOCK' },
  { id: '9', name: 'Pomidor', sku: 'INV-009', category: 'Sabzavotlar', quantity: 35, unit: 'kg', minStock: 25, costPrice: 12000, supplier: 'Fresh Veggies', lastUpdated: '2024-01-06', status: 'IN_STOCK' },
  { id: '10', name: 'Tovuq go\'shti', sku: 'INV-010', category: 'Go\'sht', quantity: 18, unit: 'kg', minStock: 20, costPrice: 42000, supplier: 'Poultry Farm', lastUpdated: '2024-01-05', status: 'LOW_STOCK' },
];

const statusConfig: Record<StockStatus, { label: string; color: string; bgColor: string }> = {
  IN_STOCK: { label: 'Mavjud', color: 'text-green-700', bgColor: 'bg-green-100' },
  LOW_STOCK: { label: 'Kam qoldi', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  OUT_OF_STOCK: { label: 'Tugagan', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const categories = ['Barchasi', 'Donlar', 'Go\'sht', 'Sabzavotlar', 'Moylar', 'Ziravorlar'];

export function InventoryPage() {
  const [items] = useState<InventoryItem[]>(mockInventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Barchasi');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'ALL'>('ALL');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<{
    id: string;
    name: string;
    barcode: string;
    price: number;
    costPrice: number;
    category?: string;
    description?: string;
    image?: string;
  } | null>(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [addUnit, setAddUnit] = useState('dona');
  const [addNotes, setAddNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleQRScan = async (barcode: string) => {
    setScanError(null);
    setAddSuccess(false);
    try {
      const product = await productApiService.getByBarcode(barcode);
      setScannedProduct({
        id: product.id,
        name: product.name,
        barcode: product.barcode || barcode,
        price: Number(product.price),
        costPrice: Number(product.costPrice || 0),
        category: product.category?.name,
        description: product.description || undefined,
        image: product.image || undefined,
      });
      setAddQuantity('');
      setAddUnit('dona');
      setAddNotes('');
    } catch {
      setScanError('Mahsulot topilmadi. QR kodni tekshiring.');
      setTimeout(() => setScanError(null), 3000);
    }
  };

  const handleAddToInventory = async () => {
    if (!scannedProduct || !addQuantity || Number(addQuantity) <= 0) return;

    setIsAdding(true);
    try {
      // Avval ombor mahsuloti bor-yo'qligini tekshiramiz, yo'q bo'lsa yaratamiz
      let inventoryItem;
      try {
        const response = await inventoryApiService.getAll({ search: scannedProduct.barcode });
        const items = response.data || [];
        inventoryItem = items.find((i: { sku: string }) => i.sku === scannedProduct.barcode);
      } catch {
        // Ignore - item not found
      }

      if (!inventoryItem) {
        // Yangi ombor mahsuloti yaratish
        inventoryItem = await inventoryApiService.create({
          name: scannedProduct.name,
          sku: scannedProduct.barcode,
          unit: addUnit,
          quantity: 0,
          costPrice: scannedProduct.costPrice,
        });
      }

      // Kirim tranzaksiyasi
      await inventoryApiService.addTransaction(inventoryItem.id, {
        type: 'IN',
        quantity: Number(addQuantity),
        notes: addNotes || `QR skanerlash orqali qo'shildi: ${scannedProduct.name}`,
      });

      setAddSuccess(true);
      setTimeout(() => {
        setScannedProduct(null);
        setAddSuccess(false);
      }, 2000);
    } catch {
      setScanError('Omborga qo\'shishda xatolik yuz berdi.');
      setTimeout(() => setScanError(null), 3000);
    } finally {
      setIsAdding(false);
    }
  };

  const closeScannedModal = () => {
    setScannedProduct(null);
    setAddSuccess(false);
    setAddQuantity('');
    setAddNotes('');
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'Barchasi' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: items.length,
    inStock: items.filter((i) => i.status === 'IN_STOCK').length,
    lowStock: items.filter((i) => i.status === 'LOW_STOCK').length,
    outOfStock: items.filter((i) => i.status === 'OUT_OF_STOCK').length,
    totalValue: items.reduce((sum, i) => sum + i.quantity * i.costPrice, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ombor</h1>
          <p className="text-sm text-gray-500">Xomashyolar va inventarizatsiya</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ScanLine size={16} />
            QR Skanerlash
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={16} />
            Eksport
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload size={16} />
            Import
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl">
            <Plus size={18} />
            Yangi mahsulot
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Jami mahsulot</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
              <p className="text-xs text-gray-500">Mavjud</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
              <p className="text-xs text-gray-500">Kam qoldi</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
              <p className="text-xs text-gray-500">Tugagan</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">{(stats.totalValue / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-gray-500">Umumiy qiymat</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === status
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {status === 'ALL' ? 'Barchasi' : statusConfig[status].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mahsulot</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kategoriya</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Miqdor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Holati</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Narx</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Yetkazuvchi</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.map((item) => {
              const config = statusConfig[item.status];
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <Package className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">{item.category}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{item.quantity}</span>
                      <span className="text-sm text-gray-500">{item.unit}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-20 rounded-full bg-gray-200">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          item.status === 'IN_STOCK' && 'bg-green-500',
                          item.status === 'LOW_STOCK' && 'bg-amber-500',
                          item.status === 'OUT_OF_STOCK' && 'bg-red-500'
                        )}
                        style={{ width: `${Math.min((item.quantity / item.minStock) * 50, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', config.bgColor, config.color)}>
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium text-gray-800">{item.costPrice.toLocaleString()}</span>
                    <span className="text-sm text-gray-500"> so'm</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">{item.supplier}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <History size={16} />
                      </button>
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Edit size={16} />
                      </button>
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeDropdown && <div className="fixed inset-0 z-0" onClick={() => setActiveDropdown(null)} />}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQRScan}
        title="Mahsulot QR Skanerlash"
      />

      {/* Scanned Product - Add to Inventory Modal */}
      {scannedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Omborga qo'shish</h3>
              <button
                onClick={closeScannedModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/20 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addSuccess ? (
              /* Success State */
              <div className="flex flex-col items-center gap-4 p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">Muvaffaqiyatli!</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {scannedProduct.name} - {addQuantity} {addUnit} omborga qo'shildi
                  </p>
                </div>
              </div>
            ) : (
              /* Product Detail + Add Form */
              <div className="p-6 space-y-5">
                {/* Product Info */}
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-500/10">
                      <Package className="h-7 w-7 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 text-lg">{scannedProduct.name}</h4>
                      {scannedProduct.description && (
                        <p className="mt-0.5 text-sm text-gray-500 truncate">{scannedProduct.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {scannedProduct.category && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {scannedProduct.category}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-mono text-gray-600">
                          {scannedProduct.barcode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white p-2.5 text-center">
                      <p className="text-xs text-gray-500">Sotish narxi</p>
                      <p className="font-bold text-gray-800">{scannedProduct.price.toLocaleString()} <span className="text-xs font-normal text-gray-500">so'm</span></p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 text-center">
                      <p className="text-xs text-gray-500">Tan narxi</p>
                      <p className="font-bold text-gray-800">{scannedProduct.costPrice.toLocaleString()} <span className="text-xs font-normal text-gray-500">so'm</span></p>
                    </div>
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Miqdor <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex flex-1 items-center rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => setAddQuantity(String(Math.max(0, Number(addQuantity) - 1)))}
                        className="flex h-11 w-11 items-center justify-center border-r border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.1"
                        className="flex-1 h-11 text-center text-lg font-bold text-gray-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setAddQuantity(String(Number(addQuantity || 0) + 1))}
                        className="flex h-11 w-11 items-center justify-center border-l border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <select
                      value={addUnit}
                      onChange={(e) => setAddUnit(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="dona">dona</option>
                      <option value="kg">kg</option>
                      <option value="litr">litr</option>
                      <option value="gramm">gramm</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Izoh (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                    placeholder="Masalan: Yangi partiya, yetkazib beruvchidan..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => {
                      closeScannedModal();
                      setIsScannerOpen(true);
                    }}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Yana skanerlash
                  </button>
                  <button
                    onClick={handleAddToInventory}
                    disabled={isAdding || !addQuantity || Number(addQuantity) <= 0}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-medium text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Qo'shilmoqda...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Omborga qo'shish
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan Error Toast */}
      {scanError && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {scanError}
        </div>
      )}
    </div>
  );
}
