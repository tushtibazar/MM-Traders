import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Tag,
  Boxes,
  AlertTriangle,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { PinPromptModal } from '../modals/PinPromptModal';

export const ProductModule: React.FC = () => {
  const { db, currentUser, addProduct, updateProduct, deleteProduct } = useApp();
  const isOwner = currentUser.role === 'owner';
  const currency = db.settings.currency || '৳';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete with PIN state
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('মুদি পণ্য');
  const [unit, setUnit] = useState('কার্টুন');
  const [piecesPerCarton, setPiecesPerCarton] = useState<number>(1);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);

  const categories = ['মুদি পণ্য', 'তেল ও ঘি', 'চা ও কফি', 'মশলা ও গুঁড়া', 'বিস্কুট ও কনফেকশনারি', 'অন্যান্য'];
  const units = ['কার্টুন', 'পিস', 'কেজি', 'লিটার', 'ডজন', 'ব্যাগ', 'প্যাকেট'];

  const openAdd = () => {
    setEditingProduct(null);
    setName('');
    setCode(`PRD-${Math.floor(100 + Math.random() * 900)}`);
    setCategory('মুদি পণ্য');
    setUnit('কার্টুন');
    setPiecesPerCarton(24);
    setPurchasePrice(0);
    setSalePrice(0);
    setCurrentStock(10);
    setMinStockAlert(5);
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCode(p.code);
    setCategory(p.category);
    setUnit(p.unit);
    setPiecesPerCarton(p.piecesPerCarton || p.cartonQty || 1);
    setPurchasePrice(p.purchasePrice);
    setSalePrice(p.salePrice);
    setCurrentStock(p.currentStock);
    setMinStockAlert(p.minStockAlert);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetProduct) {
      deleteProduct(deleteTargetProduct.id);
      setDeleteSuccessMsg(`'${deleteTargetProduct.name}' পণ্যটি সফলভাবে মুছে ফেলা হয়েছে!`);
      setTimeout(() => setDeleteSuccessMsg(''), 3500);
      setDeleteTargetProduct(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const ratio = Math.max(1, Number(piecesPerCarton) || 1);
    const calculatedPerPiecePrice = ratio > 0 ? (Number(salePrice) || 0) / ratio : Number(salePrice) || 0;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name,
        code,
        category,
        unit,
        packSize: `${ratio} পিস / কার্টন`,
        cartonQty: ratio,
        piecesPerCarton: ratio,
        perPiecePrice: calculatedPerPiecePrice,
        purchasePrice: isOwner ? Number(purchasePrice) || 0 : editingProduct.purchasePrice,
        salePrice: Number(salePrice) || 0,
        currentStock: isOwner ? Number(currentStock) || 0 : editingProduct.currentStock,
        minStockAlert: Number(minStockAlert) || 0,
      });
    } else {
      addProduct({
        name,
        code,
        category,
        unit,
        packSize: `${ratio} পিস / কার্টন`,
        cartonQty: ratio,
        piecesPerCarton: ratio,
        perPiecePrice: calculatedPerPiecePrice,
        openingStock: Number(currentStock) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        salePrice: Number(salePrice) || 0,
        minStockAlert: Number(minStockAlert) || 5,
        status: 'active',
      });
    }
    setIsModalOpen(false);
  };

  const filteredProducts = React.useMemo(() => {
    return db.products.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [db.products, selectedCategory, searchQuery]);

  return (
    <div id="product-module" className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-white shadow-xs">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-bengali">
              পণ্য ও মূল্য তালিকা (Products & Price)
            </h1>
            <p className="text-xs text-slate-500">
              ডিস্ট্রিবিউশন পণ্যের ক্যাটাগরি, বিক্রয় মূল্য ও স্টক সীমা নির্ধারণ
            </p>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            <span>নতুন পণ্য যোগ করুন</span>
          </button>
        )}
      </div>

      {/* Success banner */}
      {deleteSuccessMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-xs flex items-center gap-2.5 text-xs text-emerald-800 font-bold animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{deleteSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="পণ্য বা কোড খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
          >
            <option value="all">সব ক্যাটাগরি</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-semibold">পণ্য ও কোড</th>
                <th className="py-3 px-3 font-semibold">ক্যাটাগরি</th>
                <th className="py-3 px-3 font-semibold text-center">একক (Unit)</th>
                {isOwner && (
                  <th className="py-3 px-3 font-semibold text-right">ক্রয় মূল্য (Purchase)</th>
                )}
                <th className="py-3 px-3 font-semibold text-right">বিক্রয় মূল্য (Sale Price)</th>
                <th className="py-3 px-3 font-semibold text-center">বর্তমান স্টক</th>
                <th className="py-3 px-3 font-semibold text-center">সতর্কতা মাত্রা</th>
                {isOwner && <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLowStock = p.currentStock <= p.minStockAlert;

                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block text-sm">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{p.code}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{p.category}</td>
                    <td className="py-3 px-3 text-center text-slate-700 font-medium">
                      <span>{p.unit}</span>
                      <span className="block text-[10px] text-blue-600 font-mono font-semibold">
                        1 C = {p.piecesPerCarton || p.cartonQty || 1} P
                      </span>
                    </td>

                    {/* Purchase Price (Owner only) */}
                    {isOwner && (
                      <td className="py-3 px-3 text-right font-semibold text-slate-600">
                        {currency} {p.purchasePrice.toLocaleString()}
                      </td>
                    )}

                    {/* Sale Price */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-emerald-700 text-sm font-mono">
                        {currency} {p.salePrice.toLocaleString()}{' '}
                        <span className="text-[10px] text-slate-500 font-sans font-normal">
                          / {p.unit || 'কার্টুন'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-semibold text-blue-700 mt-0.5">
                        প্রতি পিস: {currency}{' '}
                        {((p.salePrice / (p.piecesPerCarton || p.cartonQty || 1))).toFixed(2)}
                      </div>
                    </td>

                    {/* Current Stock */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isLowStock
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="h-3 w-3" />}
                        {p.currentStock} {p.unit}
                      </span>
                    </td>

                    {/* Min stock */}
                    <td className="py-3 px-3 text-center text-slate-500">{p.minStockAlert} {p.unit}</td>

                    {/* Actions */}
                    {isOwner && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          title="সম্পাদনা করুন"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTargetProduct(p);
                            setIsDeleteModalOpen(true);
                          }}
                          className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 ml-1 transition-colors cursor-pointer"
                          title="পণ্য মুছে ফেলুন (পিন আবশ্যক)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    কোন পণ্য পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-slate-900 font-bengali mb-4">
              {editingProduct ? 'পণ্য সংশোধন' : 'নতুন পণ্য যোগ করুন'}
            </h2>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">পণ্যের নাম *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: ফ্রেশ সয়াবিন তেল ১ লিটার"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">পণ্য কোড / SKU</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">পরিমাপের একক (Unit)</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    পিস প্রতি কার্টন (Pieces per Carton) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={piecesPerCarton}
                    onChange={(e) => setPiecesPerCarton(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900"
                    placeholder="১ কার্টনে কত পিস"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    কনভার্সন: ১ কার্টন = {piecesPerCarton || 1} পিস
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">বিক্রয় মূল্য (Sale Price) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold text-emerald-700"
                />
              </div>

              {/* Read-only Auto-calculated per-piece price */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    প্রতি পিস মূল্য (Per-Piece Price)
                    <span className="text-[10px] bg-blue-200 text-blue-800 rounded px-1.5 py-0.5 font-bold">
                      স্বয়ংক্রিয় হিসাব
                    </span>
                  </span>
                  <span className="text-[11px] text-blue-700">
                    সূত্র: কার্টন রেট ({currency}{salePrice || 0}) ÷ পিস প্রতি কার্টন ({piecesPerCarton || 1})
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-base font-mono font-black text-blue-900">
                    {currency} {(piecesPerCarton > 0 ? (Number(salePrice) || 0) / piecesPerCarton : Number(salePrice) || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600 block">
                    / প্রতি পিস
                  </span>
                </div>
              </div>

              {isOwner && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ক্রয় মূল্য (Purchase Price)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">প্রাথমিক স্টক</label>
                    <input
                      type="number"
                      min="0"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ন্যূনতম স্টক সতর্কতা (Alert)</label>
                <input
                  type="number"
                  min="0"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-700"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Delete PIN Modal */}
      <PinPromptModal
        isOpen={isDeleteModalOpen}
        title="পণ্য মুছে ফেলার অনুমোদন"
        subtitle="পণ্যটি সম্পূর্ণ মুছে ফেলতে সেটিংস-এ কনফিগার করা ৪-৬ সংখ্যার পিন দিন"
        itemName={deleteTargetProduct ? `${deleteTargetProduct.name} (কোড: ${deleteTargetProduct.code})` : undefined}
        confirmButtonText="মুছে ফেলুন"
        confirmButtonVariant="danger"
        correctPin={db.settings.securityPin || currentUser.pin || '1234'}
        onSuccess={handleConfirmDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetProduct(null);
        }}
      />
    </div>
  );
};
