'use client';

import { useState } from 'react';
import { useShopStore } from '@/store/useShopStore';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddBillClient from './AddBillClient';
import WorkerPinModal from '@/components/WorkerPinModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { addWorker } from '@/app/actions/kirana';
import { addStaffToShop, removeStaffFromShop, cancelStaffInvitation } from '@/app/actions/staff';
import { useSearchParams } from 'next/navigation';
import { ENABLE_CREDIT_CUSTOMER, ENABLE_SUPPLIER_LEDGER, ENABLE_EXPENSES } from '@/lib/features';
import { 
  Package, Users, Truck, BarChart2, CreditCard, 
  Lock, Unlock, ShoppingBag, Store, UserPlus, X,
  ChevronDown, Check, MessageSquare
} from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  sellingPrice: number;
  barcode: string | null;
  stock: number | null;
}

interface CustomerItem {
  id: string;
  name: string;
  runningBalance: number;
}

interface WorkerItem {
  id: string;
  name: string;
}

interface ShopItem {
  id: string;
  name: string;
}

interface StaffMemberItem {
  id: string;
  email: string;
  name: string | null;
}

interface StaffInvitationItem {
  id: string;
  phone: string;
  createdAt: Date;
}

export default function ShopDashboardClient({
  shop,
  isOwner,
  products,
  customers,
  workers,
  myShops,
  staffMemberships,
  existingStaffEmails = [],
  staffInvitations = [],
}: {
  shop: { id: string; name: string };
  isOwner: boolean;
  products: ProductItem[];
  customers: CustomerItem[];
  workers: WorkerItem[];
  myShops: ShopItem[];
  staffMemberships: StaffMemberItem[];
  existingStaffEmails?: Array<{ email: string; name: string }>;
  staffInvitations?: StaffInvitationItem[];
}) {
  const t = useTranslations();
  const router = useRouter();

  // Zustand Session States
  const { 
    isWorkerMode, 
    activeWorker, 
    lockPin, 
    setWorkerMode, 
    setActiveWorker, 
    setLockPin, 
    clearSession 
  } = useShopStore();
  
  // Search parameters for notifications
  const searchParams = useSearchParams();
  const notice = searchParams.get('notice');
  const status = searchParams.get('status');

  // Local state for modals & forms
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showManageStaff, setShowManageStaff] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Controlled staff invite state
  const [staffPhoneInput, setStaffPhoneInput] = useState('');

  // Passcode modal states
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [showUnlockPinModal, setShowUnlockPinModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const handleShopSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      router.push(`/shop/${val}`);
    }
  };

  const handleToggleWorkerMode = () => {
    if (isWorkerMode) {
      if (lockPin) {
        setShowUnlockPinModal(true);
        setPasscode('');
        setPasscodeError(null);
      } else {
        setWorkerMode(false);
        clearSession();
      }
    } else {
      setShowSetPinModal(true);
      setPasscode('');
      setPasscodeError(null);
    }
  };

  const handleSetPasscode = () => {
    if (passcode.length !== 4) {
      setPasscodeError("Passcode must be 4 digits.");
      return;
    }
    setLockPin(passcode);
    setWorkerMode(true);
    setShowSetPinModal(false);
  };

  const handlePasscodeNumber = (num: string, isUnlock: boolean) => {
    if (passcode.length < 4) {
      const next = passcode + num;
      setPasscode(next);
      setPasscodeError(null);
      
      if (next.length === 4 && isUnlock) {
        if (next === lockPin) {
          setWorkerMode(false);
          clearSession();
          setShowUnlockPinModal(false);
        } else {
          setPasscode('');
          setPasscodeError('Invalid Lock Passcode. Try again.');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPasscode((prev) => prev.slice(0, -1));
  };

  // Check if we should restrict view (in worker mode, and active worker doesn't have owner status)
  const isRestricted = isWorkerMode;
  const isStaffOrWorker = !isOwner || isWorkerMode;

  return (
    <div className="w-full max-w-5xl space-y-6">

      {notice && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between border ${
          status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
          status === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
          'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}>
          <span>{notice}</span>
          <button 
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.delete('notice');
              params.delete('status');
              router.replace(`/shop/${shop.id}?${params.toString()}`);
            }}
            className="text-gray-400 hover:text-white text-xs cursor-pointer ml-3 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Top Bar: Switchers & Session Info */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-850 border border-gray-800 rounded-2xl gap-4 shadow-md">
        
        {/* Shop Selector Dropdown */}
        <div className="relative flex items-center gap-2.5 w-full sm:w-auto">
          <img src="/logo.png" alt="CoinTrace Logo" className="h-7 w-7 object-contain rounded-lg shrink-0" />
          
          <div className="relative w-full sm:w-60">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 hover:border-gray-600 transition-all flex items-center justify-between w-full cursor-pointer select-none"
            >
              <span className="truncate">{shop.name}</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsOpen(false)} 
                />
                <div className="absolute left-0 mt-2 bg-gray-900 border border-gray-800 rounded-xl py-1.5 shadow-2xl w-full z-50 overflow-hidden divide-y divide-gray-800/40">
                  {myShops.map((s) => {
                    const isSelected = s.id === shop.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/shop/${s.id}`);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected 
                            ? 'text-indigo-400 bg-indigo-500/5' 
                            : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                        }`}
                      >
                        <span className="truncate pr-2">{s.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info & Switches */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-end">
          {isStaffOrWorker && (
            <div className="flex items-center gap-2">
              <Link
                href={`/shop/${shop.id}/products`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 text-indigo-400 rounded-xl text-xs font-extrabold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm select-none"
              >
                <Package className="h-3.5 w-3.5" />
                {t('shop.products')}
              </Link>
              {ENABLE_CREDIT_CUSTOMER && (
                <Link
                  href={`/shop/${shop.id}/customers`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 text-indigo-400 rounded-xl text-xs font-extrabold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm select-none"
                >
                  <Users className="h-3.5 w-3.5" />
                  {t('shop.customerKhata')}
                </Link>
              )}
            </div>
          )}
          <LanguageSwitcher />

          {/* Active worker status and Lock button */}
          {isWorkerMode && activeWorker && (
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-750 px-3 py-1.5 rounded-xl shrink-0">
              <span className="text-xs text-indigo-300 font-bold">
                👤 {activeWorker.name}
              </span>
              <button
                onClick={() => setActiveWorker(null)}
                className="text-[10px] font-extrabold text-rose-400 hover:text-rose-300 px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-md transition-all active:scale-95 cursor-pointer"
              >
                Lock
              </button>
            </div>
          )}

          {/* Worker mode toggle button */}
          <button
            onClick={handleToggleWorkerMode}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
              isWorkerMode
                ? 'bg-rose-600/20 text-rose-300 border-rose-500/30 hover:bg-rose-600/30'
                : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/30'
            }`}
          >
            {isWorkerMode ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {isWorkerMode ? t('shop.exitWorkerMode') : t('shop.enterWorkerMode')}
          </button>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Navigation Sidebar (Only for Owners) */}
        {!isStaffOrWorker && (
          <div className="md:col-span-4 space-y-4 min-w-0">
          <div className="p-5 bg-gray-850 border border-gray-800 rounded-2xl shadow-md space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              {t('shop.overview')}
            </h2>
            
            <div className="grid grid-cols-1 gap-2.5">
              
              {/* Product catalog link */}
              <Link
                href={`/shop/${shop.id}/products`}
                className="flex items-center gap-3 p-3.5 bg-gray-900/60 hover:bg-gray-900 border border-gray-800/80 hover:border-gray-700 rounded-xl transition-all font-semibold text-sm group"
              >
                <Package className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                {t('shop.products')}
              </Link>

              {/* Customer Khata */}
              {ENABLE_CREDIT_CUSTOMER && (
                <Link
                  href={`/shop/${shop.id}/customers`}
                  className="flex items-center gap-3 p-3.5 bg-gray-900/60 hover:bg-gray-900 border border-gray-800/80 hover:border-gray-700 rounded-xl transition-all font-semibold text-sm group"
                >
                  <Users className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  {t('shop.customerKhata')}
                </Link>
              )}

              {/* Expense logger (Hidden for Workers) */}
              {!isWorkerMode && isOwner && ENABLE_EXPENSES && (
                <Link
                  href={`/shop/${shop.id}/expenses`}
                  className="flex items-center gap-3 p-3.5 bg-gray-900/60 hover:bg-gray-900 border border-gray-800/80 hover:border-gray-700 rounded-xl transition-all font-semibold text-sm group"
                >
                  <CreditCard className="h-5 w-5 text-rose-400 group-hover:scale-110 transition-transform" />
                  {t('shop.expenses')}
                </Link>
              )}

              {/* Supplier Khata (Hidden for Workers) */}
              {!isRestricted && isOwner && ENABLE_SUPPLIER_LEDGER && (
                <Link
                  href={`/shop/${shop.id}/suppliers`}
                  className="flex items-center gap-3 p-3.5 bg-gray-900/60 hover:bg-gray-900 border border-gray-800/80 hover:border-gray-700 rounded-xl transition-all font-semibold text-sm group animate-in fade-in duration-200"
                >
                  <Truck className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  {t('shop.supplierKhata')}
                </Link>
              )}

              {/* Reports (Hidden for Workers) */}
              {!isRestricted && isOwner && (
                <Link
                  href={`/shop/${shop.id}/reports`}
                  className="flex items-center gap-3 p-3.5 bg-gray-900/60 hover:bg-gray-900 border border-gray-800/80 hover:border-gray-700 rounded-xl transition-all font-semibold text-sm group animate-in fade-in duration-200"
                >
                  <BarChart2 className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  {t('shop.reports')}
                </Link>
              )}

            </div>
          </div>

          {/* Add Worker Panel (Owner Only, Hidden in Worker Mode) */}
          {isOwner && !isRestricted && (
            <div className="p-5 bg-gray-850 border border-gray-800 rounded-2xl shadow-md space-y-4">
              <button
                onClick={() => setShowAddWorker(!showAddWorker)}
                className="w-full flex items-center justify-between text-left text-sm font-bold text-gray-400 uppercase tracking-wider"
              >
                <span>Manage Workers</span>
                <UserPlus className="h-4 w-4 text-indigo-400" />
              </button>

              {showAddWorker && (
                <form action={addWorker} className="space-y-3 pt-2 border-t border-gray-800 animate-in slide-in-from-top-2 duration-200">
                  <input type="hidden" name="shopId" value={shop.id} />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Worker Name"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none"
                  />
                  <input
                    type="password"
                    name="pin"
                    pattern="[0-9]{4}"
                    required
                    placeholder="4-Digit PIN"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Add Worker
                  </button>
                </form>
              )}

              {workers.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Worker Profiles</p>
                  {workers.map((w) => (
                    <div key={w.id} className="text-xs text-gray-300 py-1 flex items-center justify-between bg-gray-900/30 px-2 rounded-lg">
                      <span>👤 {w.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-850 rounded text-gray-500">PIN Protected</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add Remote Staff Panel (Owner Only, Hidden in Worker Mode) */}
          {isOwner && !isRestricted && (
            <div className="p-5 bg-gray-850 border border-gray-800 rounded-2xl shadow-md space-y-4">
              <button
                onClick={() => setShowManageStaff(!showManageStaff)}
                className="w-full flex items-center justify-between text-left text-sm font-bold text-gray-400 uppercase tracking-wider"
              >
                <span>Remote Staff (WhatsApp Invite)</span>
                <UserPlus className="h-4 w-4 text-indigo-400" />
              </button>

              {showManageStaff && (
                <div className="space-y-4 pt-2 border-t border-gray-800 animate-in slide-in-from-top-2 duration-200">
                  {/* Form to Add Staff */}
                  <form action={addStaffToShop} className="space-y-3">
                    <input type="hidden" name="shopId" value={shop.id} />
                    
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">
                        Add Staff by Phone Number
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="phone"
                        required
                        value={staffPhoneInput}
                        onChange={(e) => setStaffPhoneInput(e.target.value)}
                        placeholder="Staff Phone (e.g. +91 9876543210)"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        Generate Invite
                      </button>
                    </div>
                  </form>

                  {/* List of current Staff */}
                  {staffMemberships.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-gray-800/60">
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Active Staff Accounts</p>
                      {staffMemberships.map((staff) => (
                        <div key={staff.id} className="text-xs text-gray-300 py-1.5 flex items-center justify-between bg-gray-900/30 px-2 rounded-lg border border-gray-850">
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-semibold text-gray-250 truncate">
                              {staff.name || 'Staff Member'}
                            </span>
                            <span className="text-[9px] text-gray-500 truncate">{staff.email}</span>
                          </div>
                          <form action={removeStaffFromShop}>
                            <input type="hidden" name="shopId" value={shop.id} />
                            <input type="hidden" name="userId" value={staff.id} />
                            <button
                              type="submit"
                              className="text-[9px] text-rose-450 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* List of pending Invitations */}
                  {staffInvitations && staffInvitations.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-gray-800/60">
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Pending Invitations</p>
                      {staffInvitations.map((invite) => {
                        const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                        const inviteLink = `${appUrl}/invite/accept?id=${invite.id}`;
                        const waMessage = `Hello! You have been invited to join ${shop.name} as remote staff on CoinTrace. Click here to accept the invitation: ${inviteLink}`;
                        const waHref = `https://wa.me/${invite.phone.replace('+', '')}?text=${encodeURIComponent(waMessage)}`;

                        return (
                          <div key={invite.id} className="text-xs text-gray-300 py-1.5 flex items-center justify-between bg-gray-900/10 px-2 rounded-lg border border-gray-850/40 border-dashed">
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-semibold text-gray-400 truncate">
                                {invite.phone}
                              </span>
                              <span className="text-[8px] text-indigo-400 font-bold">Waiting for acceptance</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                <MessageSquare className="h-2.5 w-2.5" />
                                Send
                              </a>
                              <form action={cancelStaffInvitation}>
                                <input type="hidden" name="shopId" value={shop.id} />
                                <input type="hidden" name="invitationId" value={invite.id} />
                                <button
                                  type="submit"
                                  className="text-[9px] text-gray-500 hover:text-rose-455 bg-gray-900 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors cursor-pointer border border-gray-800 hover:border-rose-950"
                                >
                                  Cancel
                                </button>
                              </form>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tactile Sales Checkout Area */}
        <div className={`${isStaffOrWorker ? 'md:col-span-12' : 'md:col-span-8'} space-y-4 min-w-0`}>
          <div className="p-4 sm:p-6 bg-gray-850 border border-gray-800 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-xl font-black text-gray-100 flex items-center gap-2 border-b border-gray-800 pb-3">
              <ShoppingBag className="h-6 w-6 text-emerald-400" />
              {t('sales.addSaleTitle')}
            </h2>
            
            {/* Sales registration component */}
            <AddBillClient shopId={shop.id} products={products} customers={customers} />
          </div>
        </div>

      </div>

      {/* Worker PIN login modal overlay */}
      {isWorkerMode && !activeWorker && (
        <WorkerPinModal 
          workers={workers} 
        />
      )}

      {/* Set Lock PIN Modal */}
      {showSetPinModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-gray-700/80 rounded-3xl p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-400" />
                <h3 className="font-extrabold text-gray-100">Set Lock Passcode</h3>
              </div>
              <button
                onClick={() => setShowSetPinModal(false)}
                className="p-1 bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Create a temporary 4-digit passcode. You will need to enter this passcode to exit Worker Mode and access the Owner Dashboard.
            </p>

            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-4 py-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`h-4.5 w-4.5 rounded-full border border-gray-600 transition-all ${
                      passcode.length > index ? 'bg-indigo-500 scale-110 shadow-lg shadow-indigo-500/20' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePasscodeNumber(num, false)}
                  className="py-4 text-lg font-black bg-gray-800/60 hover:bg-gray-750 border border-gray-750 hover:border-gray-600 text-gray-100 rounded-2xl active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPasscode('')}
                className="py-4 text-xs font-bold bg-gray-900 hover:bg-gray-850 text-gray-400 rounded-2xl active:scale-95 transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => handlePasscodeNumber('0', false)}
                className="py-4 text-lg font-black bg-gray-800/60 hover:bg-gray-750 border border-gray-750 hover:border-gray-600 text-gray-100 rounded-2xl active:scale-95 transition-all"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="py-4 text-xs font-bold bg-gray-900 hover:bg-gray-850 text-gray-400 rounded-2xl active:scale-95 transition-all"
              >
                ⌫
              </button>
            </div>

            {passcodeError && <p className="text-center text-xs font-semibold text-rose-400">{passcodeError}</p>}

            <button
              onClick={handleSetPasscode}
              disabled={passcode.length !== 4}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-950/20 flex items-center justify-center gap-2"
            >
              Set & Enter Worker Mode
            </button>
          </div>
        </div>
      )}

      {/* Unlock Lock PIN Modal */}
      {showUnlockPinModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-gray-700/80 rounded-3xl p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-indigo-400" />
                <h3 className="font-extrabold text-gray-100">Exit Worker Mode</h3>
              </div>
              <button
                onClick={() => setShowUnlockPinModal(false)}
                className="p-1 bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Enter the 4-digit lock passcode to access the Owner Dashboard.
            </p>

            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-4 py-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`h-4.5 w-4.5 rounded-full border border-gray-600 transition-all ${
                      passcode.length > index ? 'bg-indigo-500 scale-110 shadow-lg shadow-indigo-500/20' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePasscodeNumber(num, true)}
                  className="py-4 text-lg font-black bg-gray-800/60 hover:bg-gray-750 border border-gray-750 hover:border-gray-600 text-gray-100 rounded-2xl active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPasscode('')}
                className="py-4 text-xs font-bold bg-gray-900 hover:bg-gray-850 text-gray-400 rounded-2xl active:scale-95 transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => handlePasscodeNumber('0', true)}
                className="py-4 text-lg font-black bg-gray-800/60 hover:bg-gray-750 border border-gray-750 hover:border-gray-600 text-gray-100 rounded-2xl active:scale-95 transition-all"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="py-4 text-xs font-bold bg-gray-900 hover:bg-gray-850 text-gray-400 rounded-2xl active:scale-95 transition-all"
              >
                ⌫
              </button>
            </div>

            {passcodeError && <p className="text-center text-xs font-semibold text-rose-400">{passcodeError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
