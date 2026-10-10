"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [pin, setPin] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const savedUserId = localStorage.getItem('user_auth');
      if (savedUserId && savedUserId !== 'true') {
        const { data } = await supabase.from('USERS').select('*').eq('user_id', savedUserId).single();
        if (data) {
          setUser(data);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('user_auth');
        }
      } else if (savedUserId === 'true') {
        localStorage.removeItem('user_auth'); // clear legacy auth
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const [selectedModes, setSelectedModes] = useState<string[]>(['3_top']);
  const [digits, setDigits] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [step, setStep] = useState(1); // 1 = Entry, 2 = Price
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numberLimits, setNumberLimits] = useState<any[]>([]);
  const [payoutRates, setPayoutRates] = useState<any>({});
  const [bulkPriceInput, setBulkPriceInput] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      // โหลดข้อมูล LIMITS_AND_RATES ทั้งหมด
      const { data: limitsData } = await supabase.from('LIMITS_AND_RATES').select('*');
      
      if (limitsData) {
        // แยกเรทจ่ายพื้นฐาน (number_bet is null) กับ เลขอั้น (number_bet มีค่า)
        const baseRates = limitsData.filter(l => !l.number_bet);
        const specificLimits = limitsData.filter(l => l.number_bet);
        
        setNumberLimits(specificLimits);
        
        const rObj: any = {};
        baseRates.forEach(r => rObj[r.bet_type] = r.payout_rate);
        setPayoutRates(rObj);
      }
    };
    fetchInitialData();
  }, []);

  const handleSubmitSlip = async () => {
    if (cart.length === 0 || totalCartPrice <= 0) return;
    setIsSubmitting(true);
    
    try {
      // ตรวจสอบยอดอั้น (Max Limit) ก่อนบันทึก
      for (const item of cart) {
        const limit = numberLimits.find(l => l.number_bet === item.digits && l.bet_type === item.modeLabel);
        if (limit && Number(limit.max_accept_limit) > 0) {
          const maxLimit = Number(limit.max_accept_limit);
          const currentAccepted = Number(limit.current_accepted) || 0;
          if (currentAccepted + item.price > maxLimit) {
            const remaining = maxLimit - currentAccepted;
            throw new Error(`เลข ${item.digits} (${item.modeLabel}) เกินยอดอั้น\n(รับได้อีกแค่ ${remaining > 0 ? remaining : 0} บาท)`);
          }
        }
      }

      // 1. สร้างบิลหลัก
      const { data: slipData, error: slipError } = await supabase
        .from('BET_SLIPS')
        .insert([{ total_amount: totalCartPrice }])
        .select()
        .single();
        
      if (slipError) throw slipError;
      
      const slipId = slipData.slip_id;
      
      // 2. แปลงข้อมูลในตะกร้าให้อยู่ในรูปแบบที่จะส่งลง db
      const itemsToInsert = cart.map(item => ({
        slip_id: slipId,
        number_bet: item.digits,
        bet_type: item.modeLabel,
        amount: item.price,
        price_rate: item.rate || 0
      }));
      
      // 3. ยัดข้อมูลทั้งหมดลงตาราง items
      const { error: itemsError } = await supabase
        .from('BET_SLIPS_SUB')
        .insert(itemsToInsert);
        
      if (itemsError) throw itemsError;
      
      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: `ส่งโพยสำเร็จ! (ยอดรวม ${totalCartPrice} บาท)`,
        showConfirmButton: false,
        timer: 1500
      });
      setCart([]);
      setStep(1);
      setBulkPriceInput('');
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'ผิดพลาด',
        text: 'เกิดข้อผิดพลาดในการส่งโพย: ' + err.message,
        showConfirmButton: false,
        timer: 1500
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modesList = [
    { id: '3_top', label: '3 ตัวบน', length: 3 },
    { id: '3_toad', label: '3 ตัวโต๊ด', length: 3 },
    { id: '3_reverse', label: '3 ตัวกลับ', length: 3 },
    { id: '2_top', label: '2 ตัวบน', length: 2 },
    { id: '2_bottom', label: '2 ตัวล่าง', length: 2 },
    { id: '2_reverse', label: '2 ตัวกลับ', length: 2 },
    { id: 'run_top', label: 'วิ่งบน', length: 1 },
    { id: 'run_bottom', label: 'วิ่งล่าง', length: 1 },
  ];

  const activeLength = selectedModes.length > 0 
    ? modesList.find(m => m.id === selectedModes[0])?.length || 3
    : 3;

  const getPermutations = (str: string) => {
    if (str.length <= 1) return [str];
    const perms = new Set<string>();
    const permute = (prefix: string, remaining: string) => {
      if (remaining.length === 0) {
        perms.add(prefix);
        return;
      }
      for (let i = 0; i < remaining.length; i++) {
        permute(prefix + remaining[i], remaining.slice(0, i) + remaining.slice(i + 1));
      }
    };
    permute('', str);
    return Array.from(perms);
  };

  const handleNumpad = (num: string) => {
    if (digits.length < activeLength) {
      setDigits(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setDigits(prev => prev.slice(0, -1));
  };
  
  const handleClear = () => {
    setDigits('');
  };

  const toggleMode = (clickedModeId: string) => {
    const clickedMode = modesList.find(m => m.id === clickedModeId);
    if (!clickedMode) return;
    
    if (selectedModes.length > 0) {
      const currentLength = modesList.find(m => m.id === selectedModes[0])?.length;
      
      if (clickedMode.length === currentLength) {
        if (selectedModes.includes(clickedModeId)) {
          if (selectedModes.length > 1) {
            setSelectedModes(prev => prev.filter(id => id !== clickedModeId));
          }
        } else {
          let newSelected = [...selectedModes];
          if (clickedModeId === '3_toad') {
             newSelected = newSelected.filter(id => id !== '3_reverse');
          } else if (clickedModeId === '3_reverse') {
             newSelected = newSelected.filter(id => id !== '3_toad');
          }
          setSelectedModes([...newSelected, clickedModeId]);
        }
      } else {
        setSelectedModes([clickedModeId]);
        setDigits('');
      }
    } else {
      setSelectedModes([clickedModeId]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== 1) return; // Only listen in step 1
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key >= '0' && e.key <= '9') {
        if (digits.length < activeLength) {
          setDigits(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setDigits(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        setDigits('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [digits, activeLength, selectedModes, step]);

  // Auto Add
  useEffect(() => {
    if (digits.length === activeLength && activeLength > 0) {
      const timer = setTimeout(() => {
        handleAddToCart();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [digits, activeLength]);

  const handleAddToCart = () => {
    if (digits.length === activeLength) {
      let newItems: any[] = [];
      let hasBlocked = false;
      let blockedMessage = "";

      const baseModes = selectedModes.filter(m => m !== '3_reverse' && m !== '2_reverse');
      const effectiveBaseModes = baseModes.length === 0 ? 
        (selectedModes.includes('3_reverse') ? ['3_top'] : (selectedModes.includes('2_reverse') ? ['2_top'] : [])) 
        : baseModes;

      effectiveBaseModes.forEach(modeId => {
        const modeLabel = modesList.find(m => m.id === modeId)?.label || '';
        if (modeId === '3_toad') {
          // Check Blocked for toad
          const limit = numberLimits.find(l => l.number_bet === digits && l.bet_type === modeLabel);
          if (limit && Number(limit.max_accept_limit) === 0) {
            hasBlocked = true;
            blockedMessage += `❌ เลข ${digits} (${modeLabel}) ปิดรับแทง (เลขเต็ม)\n`;
          } else {
            let finalRate = payoutRates[modeLabel] || 900;
            let isHalfPrice = false;
            // ถ้ามี limit สำหรับเลขนี้ และไม่ได้ปิดรับ แปลว่าเป็นเลขอั้น (ลดเรทจ่าย)
            if (limit && Number(limit.max_accept_limit) > 0) {
              finalRate = limit.payout_rate;
              isHalfPrice = true;
            }
            newItems.push({ id: Date.now() + Math.random(), modeLabel, digits, price: 0, rate: finalRate, isHalfPrice });
          }
        } else {
          let isReversed = false;
          if (modeId.startsWith('3_') && selectedModes.includes('3_reverse')) isReversed = true;
          if (modeId.startsWith('2_') && selectedModes.includes('2_reverse')) isReversed = true;
          const digitsToAdd = isReversed ? getPermutations(digits) : [digits];
          
          digitsToAdd.forEach(num => {
            const limit = numberLimits.find(l => l.number_bet === num && l.bet_type === modeLabel);
            if (limit && Number(limit.max_accept_limit) === 0) {
              hasBlocked = true;
              blockedMessage += `❌ เลข ${num} (${modeLabel}) ปิดรับแทง (เลขเต็ม)\n`;
            } else {
              let finalRate = payoutRates[modeLabel] || 900;
              let isHalfPrice = false;
              if (limit && Number(limit.max_accept_limit) > 0) {
                finalRate = limit.payout_rate;
                isHalfPrice = true;
              }
              newItems.push({ id: Date.now() + Math.random(), modeLabel, digits: num, price: 0, rate: finalRate, isHalfPrice });
            }
          });
        }
      });
      
      if (hasBlocked) {
        Swal.fire({
          icon: 'warning',
          title: 'แจ้งเตือน',
          text: blockedMessage.trim(),
          showConfirmButton: false,
          timer: 1500
        });
      }

      if (newItems.length > 0) {
        setCart(prev => [...newItems, ...prev]);
      }
      setDigits('');
    }
  };

  const removeCartItem = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const removeLastCartItem = () => {
    setCart(prev => prev.slice(1));
  };

  const updateCartItemPrice = (id: number, newPrice: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, price: Number(newPrice) } : item));
  };

  const applyBulkPriceToCart = (amount: number) => {
    setCart(prev => prev.map(item => ({ ...item, price: amount })));
  };

  const removeDuplicates = () => {
    const seen = new Set();
    const filtered = cart.filter(item => {
      const key = `${item.modeLabel}-${item.digits}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setCart(filtered);
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + (item.price || 0), 0);

  const groupedCart = cart.reduce((acc: any, item) => {
    if (!acc[item.modeLabel]) acc[item.modeLabel] = [];
    acc[item.modeLabel].push(item);
    return acc;
  }, {});

  const modeOrder = ['3 ตัวบน', '3 ตัวโต๊ด', '2 ตัวบน', '2 ตัวล่าง', 'วิ่งบน', 'วิ่งล่าง'];
  const sortedGroupedModes = Object.keys(groupedCart).sort((a, b) => {
    const posA = modeOrder.indexOf(a) === -1 ? 999 : modeOrder.indexOf(a);
    const posB = modeOrder.indexOf(b) === -1 ? 999 : modeOrder.indexOf(b);
    return posA - posB;
  });

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-[#0f172a] text-white flex justify-center items-center">กำลังตรวจสอบ...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col justify-center items-center p-4 font-sans">
        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-2xl border border-gray-700 flex flex-col items-center max-w-sm w-full">
          <div className="text-2xl font-bold text-yellow-400 tracking-wider mb-6">LUCKY<span className="text-white">DRAW</span></div>
          <p className="text-gray-300 mb-6 font-bold">กรุณาใส่รหัสผ่าน 6 หลัก</p>
          <input 
            type="password" 
            value={pin}
            onChange={async (e) => {
              const val = e.target.value;
              setPin(val);
              if (val.length === 6) {
                const { data } = await supabase.from('USERS').select('*').eq('password_hash', val).eq('role', 'USER').single();
                if (data) {
                  localStorage.setItem('user_auth', data.user_id);
                  setUser(data);
                  setIsAuthenticated(true);
                } else {
                  setTimeout(() => {
                    Swal.fire({
                      icon: 'error',
                      title: 'ผิดพลาด',
                      text: 'รหัสผ่านไม่ถูกต้อง หรือไม่มีในระบบ',
                      showConfirmButton: false,
                      timer: 1500
                    });
                    setPin('');
                  }, 100);
                }
              }
            }}
            className="w-full bg-[#0f172a] text-center text-3xl tracking-widest text-yellow-400 font-bold border border-gray-600 rounded-xl py-3 focus:outline-none focus:border-yellow-400 mb-6 shadow-inner"
            maxLength={6}
            placeholder="••••••"
          />
          <button 
            onClick={async () => {
              if (pin.length === 6) {
                const { data } = await supabase.from('USERS').select('*').eq('password_hash', pin).eq('role', 'USER').single();
                if (data) {
                  localStorage.setItem('user_auth', data.user_id);
                  setUser(data);
                  setIsAuthenticated(true);
                } else {
                  Swal.fire({
                    icon: 'error',
                    title: 'ผิดพลาด',
                    text: 'รหัสผ่านไม่ถูกต้อง หรือไม่มีในระบบ',
                    showConfirmButton: false,
                    timer: 1500
                  });
                }
              }
            }}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)] text-lg"
          >
            เข้าสู่ระบบ
          </button>
        </div>
        
        {/* Signature */}
        <div className="mt-8 text-yellow-500/80 drop-shadow-md" style={{ fontFamily: "'Brush Script MT', 'Snell Roundhand', 'Lucida Handwriting', cursive", fontSize: '2rem', letterSpacing: '2px' }}>
          BY PenNueng
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex justify-center items-center p-0 font-sans">
        <div className="w-full h-screen bg-[#0f172a] overflow-hidden relative flex flex-col p-0 md:max-w-3xl md:mx-auto md:border-x md:border-slate-800">
          {/* Header Step 2 */}
          <div className="flex items-center p-5 bg-gradient-to-r from-[#1e1b4b] to-[#172554] border-b border-blue-900 shrink-0 shadow-lg">
            <button onClick={() => setStep(1)} className="text-yellow-400 font-bold text-2xl mr-4 active:scale-90">✕</button>
            <div className="text-xl font-bold text-yellow-400 tracking-wider">ใส่ราคา</div>
            <div className="ml-auto flex items-center gap-3 md:gap-4">
              <div className="text-right">
                <div className="text-[10px] text-gray-300 uppercase">เงินฝาก</div>
                <div className="text-sm font-bold text-yellow-400">฿ {user ? user.balance.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00'}</div>
              </div>
              <button 
                onClick={() => { localStorage.removeItem('user_auth'); setIsAuthenticated(false); setPin(''); }} 
                className="bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-900/50 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-colors active:scale-95"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>

          {/* Grouped Cart List */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#0f172a] text-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sortedGroupedModes.length === 0 ? (
              <div className="text-center text-gray-500 mt-10 font-bold">ยังไม่มีรายการแทง</div>
            ) : (
              sortedGroupedModes.map(mode => (
                <div key={mode} className="mb-6 shadow-sm border border-blue-900/50 rounded-lg overflow-hidden bg-[#1e293b]">
                  <div className="flex justify-between items-center bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-3 py-2 font-bold text-sm">
                    <div># {mode}</div>
                    <div className="flex gap-4 text-xs opacity-80">
                      <span>อัตราจ่าย</span>
                    </div>
                  </div>
                  <div className="p-2 flex flex-col gap-2">
                    {groupedCart[mode].map((item: any, index: number) => (
                      <div key={item.id} className="flex justify-between items-center bg-[#0f172a] p-2 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-3 w-24">
                          <span className="text-gray-400 text-xs w-4 text-right">{index + 1}.</span>
                          <span className="text-yellow-400 font-bold text-lg">{item.digits}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.isHalfPrice && <span className="text-[10px] text-orange-400 border border-orange-500/50 px-1 rounded font-bold">จ่ายครึ่ง</span>}
                          <input 
                            type="number"
                            value={item.price || ''}
                            onChange={(e) => updateCartItemPrice(item.id, e.target.value)}
                            placeholder="0"
                            className="w-20 bg-[#1e293b] text-white text-right p-1 rounded border border-gray-600 focus:border-yellow-400 outline-none h-8 font-medium"
                          />
                          <span className="text-xs text-gray-400 w-8 text-right">{item.rate}</span>
                          <button onClick={() => removeCartItem(item.id)} className="text-red-400 font-bold text-xs hover:text-red-300 ml-2">ลบ</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bulk Action Footer */}
          <div className="bg-[#1e1b4b] p-6 border-t border-blue-900 shrink-0 text-white shadow-[0_-10px_15px_rgba(0,0,0,0.2)]">
            <button onClick={removeDuplicates} className="w-full border border-purple-500 text-purple-400 py-2 rounded-lg font-bold mb-4 hover:bg-purple-900/30 transition-colors">
              ตัดเลขซ้ำ
            </button>
            
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="เพิ่มหมายเหตุโพย (ตัวเลือก)" 
                className="w-full bg-[#0f172a] border border-blue-900/50 text-white px-4 py-2.5 rounded-lg focus:border-yellow-500 outline-none text-sm placeholder-gray-500"
              />
            </div>

            <div className="flex justify-between items-center mb-2">
              <div className="text-xs text-gray-400 font-bold">ราคาเท่ากันทั้งหมด:</div>
              <input 
                autoFocus
                type="number" 
                placeholder="ระบุราคา..."
                value={bulkPriceInput}
                onChange={(e) => {
                  setBulkPriceInput(e.target.value);
                  const val = Number(e.target.value);
                  if (val > 0) applyBulkPriceToCart(val);
                }}
                className="w-24 bg-[#0f172a] border border-blue-900/50 text-white px-2 py-1 rounded focus:border-yellow-500 outline-none text-xs text-right placeholder-gray-500"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <button onClick={() => { applyBulkPriceToCart(10); setBulkPriceInput(''); }} className="bg-blue-900/50 border border-blue-700 text-yellow-400 py-1.5 rounded font-bold hover:bg-blue-800 transition-colors">10฿</button>
              <button onClick={() => { applyBulkPriceToCart(20); setBulkPriceInput(''); }} className="bg-blue-900/50 border border-blue-700 text-yellow-400 py-1.5 rounded font-bold hover:bg-blue-800 transition-colors">20฿</button>
              <button onClick={() => { applyBulkPriceToCart(50); setBulkPriceInput(''); }} className="bg-blue-900/50 border border-blue-700 text-yellow-400 py-1.5 rounded font-bold hover:bg-blue-800 transition-colors">50฿</button>
              <button onClick={() => { applyBulkPriceToCart(100); setBulkPriceInput(''); }} className="bg-blue-900/50 border border-blue-700 text-yellow-400 py-1.5 rounded font-bold hover:bg-blue-800 transition-colors">100฿</button>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => {setCart([]); setStep(1); setBulkPriceInput('');}} className="w-1/3 bg-[#0f172a] text-red-400 font-bold py-4 rounded-xl border border-red-900/50 flex items-center justify-center gap-1 active:bg-red-900/20 text-lg">
                ⊘ ยกเลิก
              </button>
              <button onClick={handleSubmitSlip} className="w-2/3 bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-lg" disabled={totalCartPrice === 0 || cart.length === 0 || isSubmitting}>
                {isSubmitting ? 'กำลังส่ง...' : `✓ ส่งโพย (฿${totalCartPrice})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex justify-center items-center p-0 font-sans">
      <div className="w-full h-screen bg-gradient-to-br from-[#1e1b4b] to-[#172554] overflow-hidden relative flex flex-row">
        
        {/* Cart Preview (Sidebar Left) */}
        <div className="w-24 md:w-72 bg-[#0f172a]/95 border-r border-blue-900/50 flex flex-col shrink-0">
          <div className="p-1 md:py-3 text-center text-yellow-500 font-bold text-[9px] md:text-sm bg-blue-950/30 border-b border-blue-900/30 mt-2">รายการแทง</div>
          
          <div className="flex-1 overflow-y-auto p-1 md:p-3 flex flex-col gap-1 md:gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sortedGroupedModes.length === 0 ? (
              <div className="text-gray-500 text-[9px] md:text-sm text-center mt-2 md:mt-4">ไม่มีรายการ</div>
            ) : (
              sortedGroupedModes.map(mode => (
                <div key={mode} className="mb-2 md:mb-4">
                  <div className="bg-[#1e293b] text-yellow-400 text-[9px] md:text-sm font-bold text-center py-0.5 md:py-1.5 rounded md:rounded-lg mb-1 border border-blue-900/50 shadow-sm leading-tight truncate px-0.5 md:px-2">{mode}</div>
                  <div className="flex flex-col gap-0.5 md:gap-2">
                    {groupedCart[mode].map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-xs px-1 py-0.5 md:px-3 md:py-2 hover:bg-blue-900/20 rounded md:rounded-lg bg-[#0f172a] border border-transparent hover:border-gray-700">
                        <span className="font-bold text-[11px] md:text-lg text-white tracking-widest">{item.digits}</span>
                        <button onClick={() => removeCartItem(item.id)} className="text-red-500 hover:text-red-400 font-bold text-[10px] md:text-base ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content Right: Numpad */}
        <div className="flex-1 flex flex-col items-center p-3 md:p-6 relative overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-full max-w-2xl flex flex-col pb-10">
            {/* Header Step 1 */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="text-lg md:text-2xl font-bold text-yellow-400 tracking-wider flex items-center gap-2">
                LUCKY<span className="text-white">DRAW</span>
                <button 
                  onClick={() => { localStorage.removeItem('user_auth'); setIsAuthenticated(false); setPin(''); }} 
                  className="bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-900/50 px-2 py-1 rounded-md text-[10px] md:text-xs font-bold transition-colors active:scale-95 ml-1 md:ml-2"
                >
                  ออกจากระบบ
                </button>
              </div>
              <div className="text-right">
                <div className="text-[9px] md:text-xs text-gray-300 uppercase tracking-widest">เงินฝาก</div>
                <div className="text-sm md:text-xl font-bold text-yellow-400">฿ {user ? user.balance.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00'}</div>
              </div>
            </div>

            <div className="bg-[#1e293b]/80 border border-blue-900/50 text-white text-center py-1.5 md:py-2.5 rounded-t-xl md:rounded-t-2xl font-bold mt-1 shadow-inner text-sm md:text-lg">ระบุตัวเลข {activeLength} หลัก</div>
          
          {/* OTP Style Inputs */}
          <div className="flex justify-center gap-2 md:gap-6 py-3 md:py-6 bg-[#0f172a] rounded-b-xl md:rounded-b-2xl mb-4 shrink-0 border-x border-b border-blue-900/50 shadow-lg">
            {Array.from({ length: activeLength }).map((_, i) => (
              <div key={i} className={`w-12 h-14 md:w-16 md:h-20 rounded-xl md:rounded-2xl flex items-center justify-center text-3xl md:text-4xl font-bold border-2 transition-all duration-300 ${digits[i] ? 'border-yellow-400 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] scale-110' : 'border-blue-900/50 text-gray-600 scale-100'}`}>
                {digits[i] || '-'}
              </div>
            ))}
          </div>

          {/* Mode Selection Grid */}
          <div className="grid grid-cols-3 gap-1.5 md:gap-3 mb-4 shrink-0">
            {modesList.map(m => (
              <button 
                key={m.id}
                onClick={() => toggleMode(m.id)}
                className={`py-1.5 md:py-2.5 rounded-lg md:rounded-xl font-bold transition-all text-[10px] md:text-sm ${selectedModes.includes(m.id) ? 'bg-gradient-to-b from-yellow-300 to-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-[#0f172a]/50 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <div className="bg-[#0f172a]/60 p-2 md:p-4 rounded-2xl md:rounded-3xl shrink-0 border border-blue-900/50 shadow-xl max-w-md mx-auto w-full">
            <div className="grid grid-cols-3 gap-1.5 md:gap-3 mb-2 md:mb-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button 
                  key={num}
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); handleNumpad(num.toString()); }}
                  className="bg-blue-950/80 border border-blue-800 text-white text-xl md:text-2xl font-medium py-2.5 md:py-3 rounded-xl md:rounded-2xl active:bg-blue-800 transition-colors shadow"
                >
                  {num}
                </button>
              ))}
              <button type="button" onPointerDown={(e) => { e.preventDefault(); handleClear(); }} className="bg-transparent text-transparent text-lg md:text-xl font-medium py-2.5 md:py-3 rounded-xl md:rounded-2xl">-</button>
              <button type="button" onPointerDown={(e) => { e.preventDefault(); handleNumpad('0'); }} className="bg-blue-950/80 border border-blue-800 text-white text-xl md:text-2xl font-medium py-2.5 md:py-3 rounded-xl md:rounded-2xl active:bg-blue-800 transition-colors shadow">
                0
              </button>
              <button type="button" onPointerDown={(e) => { e.preventDefault(); handleDelete(); }} className="bg-blue-900/40 border border-blue-800/50 text-yellow-500 flex justify-center items-center py-2.5 md:py-3 rounded-xl md:rounded-2xl active:bg-blue-800 transition-colors shadow">
                <div className="bg-yellow-600 text-black rounded px-2 md:px-3 py-1 md:py-1 text-xs md:text-base font-bold">⌫</div>
              </button>
            </div>
            <div className="flex gap-1.5 md:gap-2 mt-2">
              <button onClick={removeLastCartItem} className="w-1/4 bg-red-900/40 border border-red-800/50 text-red-300 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-[10px] md:text-xs shadow active:scale-95 transition-transform">ลบล่าสุด</button>
              <button onClick={() => setCart([])} className="w-1/4 bg-red-700/60 border border-red-800 text-white py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-[10px] md:text-xs shadow active:scale-95 transition-transform">ลบทั้งหมด</button>
              <button 
                onClick={() => setStep(2)} 
                disabled={cart.length === 0} 
                className="w-2/4 bg-green-600 hover:bg-green-500 text-white py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-[11px] md:text-sm shadow active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1"
              >
                ใส่ราคา ({cart.length})
              </button>
            </div>
          </div>
          </div>

        </div>
      </div>
    </div>
  );
}
