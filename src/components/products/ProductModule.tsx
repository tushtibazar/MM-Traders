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
  Calculator,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { PinPromptModal } from '../modals/PinPromptModal';
import { ProductPricePrintPreviewModal } from './ProductPricePrintPreviewModal';

export const ProductModule: React.FC = () => {
  const { db, currentUser, addProduct, updateProduct, deleteProduct } = useApp();
  const isOwner = currentUser.role === 'owner';
  const currency = db.settings.currency || '৳';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Delete with PIN state
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('মুদি পণ্য');
  const [unit, setUnit] = useState('কার্টুন');
  const [piecesPerCarton, setPiecesPerCarton] = useState<number>(24);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [freePieces, setFreePieces] = useState<number | string>(0);
  const [profitMargin, setProfitMargin] = useState<number>(6);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [isCalcExpanded, setIsCalcExpanded] = useState<boolean>(true);

  const categories = ['মুদি পণ্য', 'তেল ও ঘি', 'চা ও কফি', 'মশলা ও গুঁড়া', 'বিস্কুট ও কনফেকশনারি', 'অন্যান্য'];
  const units = ['কার্টুন', 'পিস', 'কেজি', 'লিটার', 'ডজন', 'ব্যাগ', 'প্যাকেট'];

  // Calculation Chain values
  const stdPcs = Math.max(1, Number(piecesPerCarton) || 1);
  const buyCost = Math.max(0, Number(purchasePrice) || 0);
  const freePcs = Math.max(0, parseFloat(String(freePieces)) || 0);
  const marginPct = Number(profitMargin) || 0;
  const adjAmt = Number(adjustment) || 0;

  // Step A — মোট প্রাপ্ত পিস (Total Pieces Actually Received) = পিস প্রতি কার্টন (স্বাভাবিক) + ফ্রি পিস
  const stepA = stdPcs + freePcs;

  // Step B — প্রকৃত ক্রয়মূল্য/পিস (Actual Cost Per Piece) = ক্রয়মূল্য (কার্টন) ÷ মোট প্রাপ্ত পিস
  const stepB = stepA > 0 && buyCost > 0 ? buyCost / stepA : 0;

  // Step C — কার্টন বেস মূল্য (Base Carton Price, before margin) = প্রকৃত ক্রয়মূল্য/পিস × পিস প্রতি কার্টন (স্বাভাবিক)
  const stepC = stepB * stdPcs;

  // Step D — মার্জিনসহ মূল্য (Price with Margin) = কার্টন বেস মূল্য × (1 + প্রফিট মার্জিন% ÷ 100)
  const stepD = stepC * (1 + marginPct / 100);

  // Step E — চূড়ান্ত বিক্রয়মূল্য (কার্টন) (Final Selling Price per Carton) = মার্জিনসহ মূল্য + সমন্বয় (৳)
  const stepE = buyCost > 0 ? Math.max(0, stepD + adjAmt) : 0;

  const handleCalcFieldChange = (
    field: 'purchasePrice' | 'piecesPerCarton' | 'freePieces' | 'profitMargin' | 'adjustment',
    val: number | string
  ) => {
    let newBuy = Number(purchasePrice) || 0;
    let newStd = Number(piecesPerCarton) || 24;
    let newFree = parseFloat(String(freePieces)) || 0;
    let newMarg = Number(profitMargin) || 0;
    let newAdj = Number(adjustment) || 0;

    if (field === 'purchasePrice') {
      newBuy = Number(val) || 0;
      setPurchasePrice(newBuy);
    }
    if (field === 'piecesPerCarton') {
      newStd = Math.max(1, Number(val) || 1);
      setPiecesPerCarton(newStd);
    }
    if (field === 'freePieces') {
      setFreePieces(val);
      newFree = Math.max(0, parseFloat(String(val)) || 0);
    }
    if (field === 'profitMargin') {
      newMarg = Number(val) || 0;
      setProfitMargin(newMarg);
    }
    if (field === 'adjustment') {
      newAdj = Number(val) || 0;
      setAdjustment(newAdj);
    }

    const sP = Math.max(1, newStd || 1);
    const bC = Math.max(0, newBuy || 0);
    const fP = Math.max(0, newFree || 0);
    const totR = sP + fP;
    const cPerP = totR > 0 && bC > 0 ? bC / totR : 0;
    const bCtn = cPerP * sP;
    const wMarg = bCtn * (1 + (newMarg || 0) / 100);
    const finP = bC > 0 ? Math.max(0, wMarg + (newAdj || 0)) : 0;

    if (bC > 0) {
      setSalePrice(Number(finP.toFixed(2)));
    }
  };

  const openAdd = () => {
    setEditingProduct(null);
    setName('');
    setCode(`PRD-${Math.floor(100 + Math.random() * 900)}`);
    setCategory('মুদি পণ্য');
    setUnit('কার্টুন');
    setPiecesPerCarton(24);
    setPurchasePrice(0);
    setFreePieces(0);
    setProfitMargin(6);
    setAdjustment(0);
    setSalePrice(0);
    setCurrentStock(10);
    setMinStockAlert(5);
    setIsCalcExpanded(true);
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCode(p.code);
    setCategory(p.category);
    setUnit(p.unit);
    setPiecesPerCarton(p.piecesPerCarton || p.cartonQty || 24);
    setPurchasePrice(p.purchasePrice || 0);
    setFreePieces(p.freePieces !== undefined ? p.freePieces : 0);
    setProfitMargin(p.profitMargin !== undefined ? p.profitMargin : 6);
    setAdjustment(p.adjustment || 0);
    setSalePrice(p.salePrice || 0);
    setCurrentStock(p.currentStock);
    setMinStockAlert(p.minStockAlert);
    setIsCalcExpanded(true);
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
    const finalPrice = Number(salePrice) || 0;
    const calculatedPerPiecePrice = ratio > 0 ? finalPrice / ratio : finalPrice;
    const freePieceNum = parseFloat(String(freePieces)) || 0;

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
        salePrice: finalPrice,
        freePieces: isOwner ? freePieceNum : (editingProduct.freePieces ?? 0),
        profitMargin: isOwner ? Number(profitMargin) || 0 : editingProduct.profitMargin,
        adjustment: isOwner ? Number(adjustment) || 0 : editingProduct.adjustment,
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
        salePrice: finalPrice,
        freePieces: freePieceNum,
        profitMargin: Number(profitMargin) || 0,
        adjustment: Number(adjustment) || 0,
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPrintPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-950 shadow-2xs transition-colors cursor-pointer"
            title="পণ্য ও মূল্য তালিকা প্রিন্ট প্রিভিউ দেখুন"
          >
            <Printer className="h-4 w-4 text-emerald-600" />
            <span>প্রিন্ট প্রিভিউ</span>
          </button>

          {isOwner && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>নতুন পণ্য যোগ করুন</span>
            </button>
          )}
        </div>
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
          <div className="w-full max-w-lg sm:max-w-xl rounded-xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900 font-bengali mb-4">
              {editingProduct ? 'পণ্য সংশোধন' : 'নতুন পণ্য যোগ করুন'}
            </h2>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">পণ্যের নাম *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: ফ্রেশ সয়াবিন তেল ১ লিটার"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                    পিস প্রতি কার্টন (স্বাভাবিক) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={piecesPerCarton || ''}
                    onChange={(e) =>
                      handleCalcFieldChange('piecesPerCarton', Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold font-mono text-slate-900"
                    placeholder="১ কার্টনে কত পিস (যেমন: 24)"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    কনভার্সন: ১ কার্টন = {piecesPerCarton || 1} পিস
                  </p>
                </div>
              </div>

              {/* Purchase-to-Selling Price Calculator ("মূল্য নির্ধারণ হিসাব") */}
              {isOwner && (
                <div className="rounded-xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/60 via-teal-50/20 to-white p-3.5 space-y-3 shadow-xs">
                  {/* Expandable Section Header */}
                  <div
                    onClick={() => setIsCalcExpanded(!isCalcExpanded)}
                    className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-emerald-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                        <Calculator className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm font-bengali flex items-center gap-1.5">
                          মূল্য নির্ধারণ হিসাব (Purchase-to-Selling Price Calculator)
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          ক্রয়মূল্য, ফ্রি পিস ও মার্জিন থেকে স্বয়ংক্রিয় কার্টন রেট নির্ণয়
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        {isCalcExpanded ? 'সংক্ষিপ্ত করুন' : 'বিস্তারিত দেখুন'}
                      </span>
                      {isCalcExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {isCalcExpanded && (
                    <div className="space-y-3 pt-1">
                      {/* Calculator Inputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* 1. ক্রয়মূল্য (কার্টন) */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                            ১. ক্রয়মূল্য (কার্টন)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-slate-400 font-bold">
                              {currency}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={purchasePrice || ''}
                              onChange={(e) =>
                                handleCalcFieldChange('purchasePrice', Math.max(0, Number(e.target.value) || 0))
                              }
                              placeholder="যেমন: 400"
                              className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-1.5 font-bold font-mono text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            ১ কার্টনের পাইকারি ক্রয়মূল্য
                          </p>
                        </div>

                        {/* 2. পিস প্রতি কার্টন (স্বাভাবিক) — Linked to piecesPerCarton */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                            ২. পিস প্রতি কার্টন (স্বাভাবিক)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={piecesPerCarton || ''}
                            onChange={(e) =>
                              handleCalcFieldChange('piecesPerCarton', Math.max(1, Number(e.target.value) || 1))
                            }
                            placeholder="যেমন: 24"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold font-mono text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            স্বাভাবিক কার্টন সাইজ (কনভার্সন)
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* 3. ফ্রি পিস (এই ক্রয়ে) */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                            ৩. ফ্রি পিস (এই ক্রয়ে)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={freePieces === '' ? '' : freePieces}
                            onChange={(e) =>
                              handleCalcFieldChange('freePieces', e.target.value)
                            }
                            placeholder="যেমন: 0.5 বা 3 (না থাকলে 0)"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold font-mono text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            অতিরিক্ত প্রাপ্ত ফ্রি পিস (যেমন: 0.5 বা 3)
                          </p>
                        </div>

                        {/* 4. প্রফিট মার্জিন (%) */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                            ৪. প্রফিট মার্জিন (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={profitMargin !== undefined ? profitMargin : ''}
                              onChange={(e) =>
                                handleCalcFieldChange('profitMargin', Number(e.target.value) || 0)
                              }
                              placeholder="যেমন: 6"
                              className="w-full rounded-lg border border-slate-300 bg-white pr-7 pl-3 py-1.5 font-bold font-mono text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="absolute right-2.5 top-2 text-slate-400 font-bold">
                              %
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            কাঙ্ক্ষিত মুনাফা শতকরা হার
                          </p>
                        </div>

                        {/* 5. সমন্বয় (৳) */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                            ৫. সমন্বয় (৳)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={adjustment || ''}
                            onChange={(e) =>
                              handleCalcFieldChange('adjustment', Number(e.target.value) || 0)
                            }
                            placeholder="যেমন: +1 বা -0.50"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold font-mono text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            রাউন্ডিং/সমন্বয় (+ / -)
                          </p>
                        </div>
                      </div>

                      {/* Live Calculation Chain (Steps A through E) */}
                      <div className="rounded-xl border border-emerald-300 bg-white p-3 space-y-2 text-xs shadow-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-[11px]">
                          <span className="font-bold text-slate-800 font-bengali">
                            হিসাবের ধারাবাহিক বিবরণ (Calculation Breakdown)
                          </span>
                          <span className="text-[9px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                            লাইভ ফলাফল
                          </span>
                        </div>

                        {/* Step A */}
                        <div className="flex items-center justify-between py-1 text-[11px]">
                          <span className="text-slate-600">
                            <strong>Step A</strong> — মোট প্রাপ্ত পিস (Total Pieces):
                            <span className="text-slate-400 block text-[10px]">
                              পিস প্রতি কার্টন ({stdPcs}) + ফ্রি পিস ({freePcs})
                            </span>
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {Number(stepA.toFixed(2))} পিস
                          </span>
                        </div>

                        {/* Step B */}
                        <div className="flex items-center justify-between py-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-600">
                            <strong>Step B</strong> — প্রকৃত ক্রয়মূল্য/পিস (Cost per Piece):
                            <span className="text-slate-400 block text-[10px]">
                              ক্রয়মূল্য ({currency}{buyCost}) ÷ মোট প্রাপ্ত পিস ({Number(stepA.toFixed(2))})
                            </span>
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {currency} {stepB.toFixed(2)}
                          </span>
                        </div>

                        {/* Step C */}
                        <div className="flex items-center justify-between py-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-600">
                            <strong>Step C</strong> — কার্টন বেস মূল্য (Base Carton Price):
                            <span className="text-slate-400 block text-[10px]">
                              প্রকৃত ক্রয়মূল্য/পিস ({currency}{stepB.toFixed(2)}) × স্বাভাবিক কার্টন ({stdPcs} পিস)
                            </span>
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {currency} {stepC.toFixed(2)}
                          </span>
                        </div>

                        {/* Step D */}
                        <div className="flex items-center justify-between py-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-600">
                            <strong>Step D</strong> — মার্জিনসহ মূল্য (Price with {marginPct}% Margin):
                            <span className="text-slate-400 block text-[10px]">
                              কার্টন বেস ({currency}{stepC.toFixed(2)}) × (১ + {marginPct}% ÷ ১০০)
                            </span>
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {currency} {stepD.toFixed(2)}
                          </span>
                        </div>

                        {/* Step E */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 mt-1">
                          <div>
                            <span className="font-black text-emerald-950 block text-xs">
                              Step E — চূড়ান্ত বিক্রয়মূল্য (কার্টন রেট):
                            </span>
                            <span className="text-emerald-700 text-[10px]">
                              মার্জিনসহ ({currency}{stepD.toFixed(2)}) {adjAmt >= 0 ? `+ সমন্বয় (${adjAmt})` : `- সমন্বয় (${Math.abs(adjAmt)})`}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-black text-emerald-900 text-base sm:text-lg">
                              {currency} {stepE.toFixed(2)}
                            </div>
                            <span className="text-[9px] text-emerald-600 font-semibold block">
                              / প্রতি কার্টন
                            </span>
                          </div>
                        </div>

                        {/* Quick Apply Button */}
                        <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (stepE > 0) {
                                setSalePrice(Number(stepE.toFixed(2)));
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            কার্টন রেটে প্রয়োগ করুন ({currency}{stepE.toFixed(2)})
                          </button>
                          <span className="text-[10px] text-slate-500 italic">
                            নিচের বিক্রয়মূল্য ফিল্ডে সরাসরি এডিট করার সুবিধাও রয়েছে
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Final Carton Rate / Sale Price Input (Always directly editable) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    বিক্রয় মূল্য / কার্টন রেট (Sale Price) *
                  </label>
                  {isOwner && buyCost > 0 && Math.abs(salePrice - Number(stepE.toFixed(2))) < 0.01 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ ক্যালকুলেটর হতে নির্ধারিত
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold font-mono text-emerald-700 text-base"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  এই রেটটি ডেলিভারি ও দৈনিক বিক্রি খতিয়ানসহ সর্বত্র কার্টন রেট হিসেবে ব্যবহৃত হবে
                </p>
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

              {/* Stock and Alert Settings */}
              <div className="grid grid-cols-2 gap-3">
                {isOwner ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">প্রাথমিক স্টক (Stock)</label>
                    <input
                      type="number"
                      min="0"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    />
                  </div>
                ) : (
                  <div />
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

      {/* Product Price List Print Preview Modal */}
      <ProductPricePrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        settings={db.settings}
        currency={currency}
        products={db.products}
      />
    </div>
  );
};
