"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Coins, Ban, Trophy, CalendarDays, ChevronLeft, ChevronRight, Trash2, Edit } from 'lucide-react';
import Swal from 'sweetalert2';

const ThaiDatePicker = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const thaiDays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const days = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const handleSelectDate = (d: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    const y = selected.getFullYear();
    const m = String(selected.getMonth() + 1).padStart(2, '0');
    const day = String(selected.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${day}`);
    setIsOpen(false);
  };

  const displayDate = value ? new Date(value) : new Date();

  return (
    <div className="relative" ref={popupRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#1e293b] text-white px-4 py-2 md:py-3 rounded-xl border border-gray-700 hover:border-yellow-400 outline-none shadow-sm cursor-pointer transition-all flex items-center justify-between min-w-[160px]"
      >
        <span className="font-bold">{value ? `${displayDate.getDate()} ${thaiMonths[displayDate.getMonth()]} ${displayDate.getFullYear() + 543}` : 'เลือกวันที่'}</span>
        <span className="text-yellow-400 ml-3 text-lg">📅</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-[100] mt-2 left-0 md:left-auto md:right-0 bg-[#0f172a] border border-gray-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-4 w-[280px]">
          <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors">◀</button>
            <div className="font-bold text-yellow-400 text-lg">
              {thaiMonths[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
            </div>
            <button onClick={handleNextMonth} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors">▶</button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {thaiDays.map((d, idx) => (
              <div key={d} className={`text-xs font-bold ${idx === 0 ? 'text-red-400' : 'text-gray-400'}`}>{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2"></div>
            ))}
            {Array.from({ length: days }).map((_, i) => {
              const d = i + 1;
              const isSelected = value && displayDate.getDate() === d && displayDate.getMonth() === viewDate.getMonth() && displayDate.getFullYear() === viewDate.getFullYear();
              const isToday = new Date().getDate() === d && new Date().getMonth() === viewDate.getMonth() && new Date().getFullYear() === viewDate.getFullYear();
              
              return (
                <button
                  key={d}
                  onClick={() => handleSelectDate(d)}
                  className={`p-1.5 rounded-full w-8 h-8 mx-auto flex items-center justify-center text-sm transition-all ${isSelected ? 'bg-yellow-500 text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.6)] scale-110' : isToday ? 'bg-gray-700 text-yellow-400 font-bold border border-gray-500' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminCheckingAuth, setIsAdminCheckingAuth] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const savedUserId = localStorage.getItem('admin_auth');
      if (savedUserId && savedUserId !== 'true') {
        const { data } = await supabase.from('USERS').select('*').eq('user_id', savedUserId).eq('role', 'ADMIN').single();
        if (data) {
          setIsAdminAuthenticated(true);
        } else {
          localStorage.removeItem('admin_auth');
        }
      } else if (savedUserId === 'true') {
        localStorage.removeItem('admin_auth');
      }
      setIsAdminCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  // Data states
  const [rates, setRates] = useState<any>({});
  const [limits, setLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states for new limit
  const [newLimitDigits, setNewLimitDigits] = useState('');
  const [newLimitMode, setNewLimitMode] = useState('3 ตัวบน');
  const [newLimitType, setNewLimitType] = useState('half_price');
  const [newLimitRate, setNewLimitRate] = useState('');

  // Results states
  const [result3Top, setResult3Top] = useState('');
  const [result2Bottom, setResult2Bottom] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [drawHistory, setDrawHistory] = useState<any[]>([]);
  const [confirmingLimitId, setConfirmingLimitId] = useState<string | null>(null);
  const [confirmingDrawId, setConfirmingDrawId] = useState<string | null>(null);

  // Dashboard states
  const [selectedDate, setSelectedDate] = useState('');
  const [dashboardStats, setDashboardStats] = useState<any>({ totalAmount: 0, totalSlips: 0, estimatedProfit: 0, totalPayout: 0, netProfit: 0, hasResults: false, winningNumbers: null });
  const [hotNumbers, setHotNumbers] = useState<any[]>([]);

  // Fetch initial data
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);
    setDrawDate(todayStr);
    fetchData();
  }, []);

  useEffect(() => {
    if (activeMenu === 'dashboard' && selectedDate && Object.keys(rates).length > 0) {
      fetchDashboardData();
    }
  }, [selectedDate, activeMenu, rates, limits]);

  // Keyboard input for Add Limit modal
  useEffect(() => {
    if (!showLimitModal) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
      
      const maxLen = newLimitMode.includes('3') ? 3 : (newLimitMode.includes('2') ? 2 : 1);
      
      if (e.key >= '0' && e.key <= '9') {
        setNewLimitDigits(prev => prev.length < maxLen ? prev + e.key : prev);
      } else if (e.key === 'Backspace') {
        setNewLimitDigits(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        setNewLimitDigits('');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLimitModal, newLimitMode, newLimitDigits]);

  const fetchDashboardData = async () => {
    if (!selectedDate) return;
    setLoading(true);
    
    // ดึงบิลทั้งหมดของวันที่เลือก
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: slips } = await supabase
      .from('BET_SLIPS')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    let tAmount = 0;
    let tSlips = 0;
    
    if (slips) {
      tAmount = slips.reduce((sum, slip) => sum + Number(slip.total_amount), 0);
      tSlips = slips.length;
    }

    // Fetch Draws for selectedDate
    const { data: draws } = await supabase
      .from('DRAWS')
      .select('*')
      .eq('draw_date', selectedDate);
    
    let drawResult: any = null;
    if (draws && draws.length > 0) {
      drawResult = draws[0].winning_numbers; 
    }

    // ดึงรายละเอียดโพยเพื่อจัดอันดับเลขมาแรงและคิดผลแพ้ชนะ
    const { data: items } = await supabase
      .from('BET_SLIPS_SUB')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    let tPayout = 0;

    if (items) {
      const grouped: any = {};
      items.forEach(item => {
        let isWin = false;
        // คำนวณผลชนะ
        if (drawResult) {
          const top3 = drawResult["3TOP"] || "";
          const bot2 = drawResult["2BOT"] || "";
          
          if (item.bet_type === '3 ตัวบน' && top3 && item.number_bet === top3) isWin = true;
          if (item.bet_type === '3 ตัวโต๊ด' && top3) {
              const sortedBet = item.number_bet.split('').sort().join('');
              const sortedRes = top3.split('').sort().join('');
              if (sortedBet === sortedRes) isWin = true;
          }
          if (item.bet_type === '2 ตัวบน' && top3 && top3.length >= 2) {
              if (item.number_bet === top3.slice(-2)) isWin = true;
          }
          if (item.bet_type === '2 ตัวล่าง' && bot2) {
              if (item.number_bet === bot2) isWin = true;
          }
          if (item.bet_type === 'วิ่งบน' && top3) {
              if (top3.includes(item.number_bet)) isWin = true;
          }
          if (item.bet_type === 'วิ่งล่าง' && bot2) {
              if (bot2.includes(item.number_bet)) isWin = true;
          }
          
          if (isWin) {
              let multiplier = rates[item.bet_type] || Number(item.price_rate);
              const specificLimit = limits.find(l => l.number_bet === item.number_bet && l.bet_type === item.bet_type);
              if (specificLimit && specificLimit.payout_rate !== undefined) {
                  multiplier = specificLimit.payout_rate;
              }
              tPayout += Number(item.amount) * Number(multiplier);
          }
        }

        // จัดอันดับเลขมาแรง
        const key = `${item.number_bet}-${item.bet_type}`;
        if (!grouped[key]) {
          grouped[key] = { digits: item.number_bet, mode: item.bet_type, total_amount: 0, total_payout: 0, is_win: false };
        }
        grouped[key].total_amount += Number(item.amount);
        if (isWin) {
          let multiplier = rates[item.bet_type] || Number(item.price_rate);
          const specificLimit = limits.find(l => l.number_bet === item.number_bet && l.bet_type === item.bet_type);
          if (specificLimit && specificLimit.payout_rate !== undefined) {
              multiplier = specificLimit.payout_rate;
          }
          grouped[key].is_win = true;
          grouped[key].total_payout += Number(item.amount) * Number(multiplier);
        }
      });
      const modeGroups: any = {};
      Object.values(grouped).forEach((item: any) => {
        if (!modeGroups[item.mode]) modeGroups[item.mode] = [];
        modeGroups[item.mode].push(item);
      });
      
      const modeOrder = ['3 ตัวบน', '3 ตัวโต๊ด', '3 ตัวกลับ', '2 ตัวบน', '2 ตัวล่าง', '2 ตัวกลับ', 'วิ่งบน', 'วิ่งล่าง'];
      const groupedList: any[] = [];
      
      modeOrder.forEach(mode => {
        if (modeGroups[mode]) {
           modeGroups[mode].sort((a: any, b: any) => b.total_amount - a.total_amount).slice(0, 10).forEach((i: any) => groupedList.push(i));
        }
      });
      setHotNumbers(groupedList);
    }
    
    setDashboardStats({
      totalAmount: tAmount,
      totalSlips: tSlips,
      estimatedProfit: tAmount * 0.3,
      totalPayout: tPayout,
      netProfit: tAmount - tPayout,
      hasResults: !!drawResult,
      winningNumbers: drawResult
    });

    setLoading(false);
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: limitsData } = await supabase.from('LIMITS_AND_RATES').select('*');
    const ratesObj: any = {};
    const specificLimits: any[] = [];
    
    if (limitsData && limitsData.length > 0) {
      limitsData.forEach(r => {
        if (!r.number_bet) {
          ratesObj[r.bet_type] = r.payout_rate;
          if (r.bet_type === 'GLOBAL') { ratesObj['GLOBAL_MAX_BET'] = r.max_accept_limit; }
        } else {
          specificLimits.push(r);
        }
      });
      if (!ratesObj['GLOBAL_MAX_BET']) { ratesObj['GLOBAL_MAX_BET'] = 500; }
    } else {
      ratesObj['3 ตัวบน'] = 900; ratesObj['3 ตัวโต๊ด'] = 150; ratesObj['2 ตัวบน'] = 90;
      ratesObj['2 ตัวล่าง'] = 90; ratesObj['วิ่งบน'] = 3.2; ratesObj['วิ่งล่าง'] = 4.2; ratesObj['GLOBAL_MAX_BET'] = 500;
    }
    setRates(ratesObj);
    setLimits(specificLimits);
    
    await fetchDrawHistory();
    setLoading(false);
  };

  const fetchDrawHistory = async () => {
    const { data } = await supabase.from('DRAWS').select('*').order('draw_date', { ascending: false });
    if (data) setDrawHistory(data);
  };

  const handleSaveRates = async () => {
    let hasError = false; let errorMessage = "";
    const globalMax = rates['GLOBAL_MAX_BET'] || 500;
    
    const updates = Object.keys(rates).filter(m => m !== 'GLOBAL_MAX_BET').map(async (mode) => {
      const { data: existing } = await supabase.from('LIMITS_AND_RATES').select('limit_id').is('number_bet', null).eq('bet_type', mode).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('LIMITS_AND_RATES').update({ payout_rate: rates[mode] }).eq('limit_id', existing.limit_id);
        if (error) { hasError = true; errorMessage = error.message; }
      } else {
        const { error } = await supabase.from('LIMITS_AND_RATES').insert({ bet_type: mode, max_accept_limit: 999999, payout_rate: rates[mode] });
        if (error) { hasError = true; errorMessage = error.message; }
      }
    });
    await Promise.all(updates);
    
    const { data: globalExisting } = await supabase.from('LIMITS_AND_RATES').select('limit_id').is('number_bet', null).eq('bet_type', 'GLOBAL').maybeSingle();
    if (globalExisting) {
      await supabase.from('LIMITS_AND_RATES').update({ max_accept_limit: globalMax }).eq('limit_id', globalExisting.limit_id);
    } else {
      await supabase.from('LIMITS_AND_RATES').insert({ bet_type: 'GLOBAL', max_accept_limit: globalMax, payout_rate: 0 });
    }
    
    if (hasError) { 
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: "Error: " + errorMessage, showConfirmButton: false, timer: 1500 });
    } else { 
      Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'บันทึกข้อมูลเรียบร้อยแล้ว!', showConfirmButton: false, timer: 1500 });
      setSaveSuccess(true); 
      setTimeout(() => setSaveSuccess(false), 3000); 
    }
  };

  const handleAddLimit = async () => {
    if (!newLimitDigits) return Swal.fire({ icon: 'warning', title: 'แจ้งเตือน', text: "กรุณาใส่ตัวเลข", showConfirmButton: false, timer: 1500 });
    const maxLimit = newLimitType === 'blocked' ? 0 : 999999;
    const rate = newLimitType === 'blocked' ? 0 : Number(newLimitRate);
    const { error } = await supabase.from('LIMITS_AND_RATES').insert({ bet_type: newLimitMode, number_bet: newLimitDigits, max_accept_limit: maxLimit, payout_rate: rate });
    if (error) { 
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: "Error: " + error.message, showConfirmButton: false, timer: 1500 });
    } else { 
      Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: "เพิ่มเลขอั้นสำเร็จ!", showConfirmButton: false, timer: 1500 });
      setShowLimitModal(false); 
      fetchData(); 
    }
  };

  const handleSaveResults = async () => {
    if (!result3Top || !result2Bottom) return Swal.fire({ icon: 'warning', title: 'แจ้งเตือน', text: "กรุณากรอกผลรางวัลให้ครบถ้วน", showConfirmButton: false, timer: 1500 });
    
    // Check if draw already exists for the selected date
    const { data: existingDraw } = await supabase.from('DRAWS').select('draw_id').eq('draw_date', drawDate).maybeSingle();

    let error = null;
    if (existingDraw) {
      const { error: updateError } = await supabase.from('DRAWS').update({
        status: 'COMPLETED',
        winning_numbers: { "3TOP": result3Top, "2BOT": result2Bottom }
      }).eq('draw_id', existingDraw.draw_id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('DRAWS').insert({
        draw_date: drawDate,
        status: 'COMPLETED',
        winning_numbers: { "3TOP": result3Top, "2BOT": result2Bottom }
      });
      error = insertError;
    }
    
    if (error) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: "Error: " + error.message, showConfirmButton: false, timer: 1500 });
    } else {
      Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: "ประกาศผลรางวัลเรียบร้อยแล้ว!", showConfirmButton: false, timer: 1500 });
      setResult3Top('');
      setResult2Bottom('');
      fetchDrawHistory();
      if (selectedDate === drawDate) {
        fetchDashboardData();
      }
    }
  };

  if (isAdminCheckingAuth) {
    return <div className="min-h-screen bg-[#0f172a] text-white flex justify-center items-center">กำลังตรวจสอบ...</div>;
  }

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col justify-center items-center p-4 font-sans">
        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-2xl border border-gray-700 flex flex-col items-center max-w-sm w-full">
          <div className="bg-blue-600/20 p-4 rounded-full mb-6">
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-6">ผู้ดูแลระบบ</h2>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const { data } = await supabase.from('USERS').select('*').eq('username', username).eq('password_hash', password).eq('role', 'ADMIN').single();
                if (data) {
                  localStorage.setItem('admin_auth', data.user_id);
                  setIsAdminAuthenticated(true);
                } else {
                  Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง หรือไม่มีในระบบ', showConfirmButton: false, timer: 1500 });
                }
              }
            }}
            placeholder="ชื่อผู้ใช้"
            className="w-full bg-[#0f172a] text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-400 mb-4 font-medium placeholder-gray-500"
          />
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const { data } = await supabase.from('USERS').select('*').eq('username', username).eq('password_hash', password).eq('role', 'ADMIN').single();
                if (data) {
                  localStorage.setItem('admin_auth', data.user_id);
                  setIsAdminAuthenticated(true);
                } else {
                  Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง หรือไม่มีในระบบ', showConfirmButton: false, timer: 1500 });
                }
              }
            }}
            placeholder="รหัสผ่าน"
            className="w-full bg-[#0f172a] text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-400 mb-6 font-medium placeholder-gray-500"
          />
          <button 
            onClick={async () => {
              const { data } = await supabase.from('USERS').select('*').eq('username', username).eq('password_hash', password).eq('role', 'ADMIN').single();
              if (data) {
                localStorage.setItem('admin_auth', data.user_id);
                setIsAdminAuthenticated(true);
              } else {
                Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง หรือไม่มีในระบบ', showConfirmButton: false, timer: 1500 });
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] text-lg"
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

  if (loading) return <div className="min-h-screen bg-[#0f172a] text-white flex justify-center items-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans pb-24 md:pb-0 overflow-x-hidden w-full">
      <div className="flex flex-col w-full max-w-7xl mx-auto">
        {/* Main Content */}
        <div className="flex-1 p-4 md:p-6 min-w-0 w-full">
          
          {/* Mobile Header */}
          <div className="md:hidden flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-yellow-400">
              {activeMenu === 'dashboard' ? 'สรุปยอดรวม' : activeMenu === 'rates' ? 'ตั้งค่าอัตราจ่าย' : activeMenu === 'limits' ? 'จัดการเลขอั้น' : 'ประกาศผลรางวัล'}
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400">Admin_01</div>
              <button 
                onClick={() => {
                  localStorage.removeItem('admin_auth');
                  setIsAdminAuthenticated(false);
                  setUsername('');
                  setPassword('');
                }}
                className="bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors active:scale-95"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>

          {/* Desktop Topbar Navigation */}
          <div className="hidden md:flex bg-[#1e293b]/80 backdrop-blur-md rounded-2xl p-2 mb-8 shadow-xl border border-gray-700/50 items-center justify-between sticky top-4 z-50">
            <div className="flex items-center gap-2 px-4 border-r border-gray-700/50 mr-2">
              <span className="text-xl font-bold text-yellow-400">Admin Panel</span>
            </div>
            
            <div className="flex flex-1 gap-2">
              <button onClick={() => setActiveMenu('dashboard')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${activeMenu === 'dashboard' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <BarChart3 className="w-4 h-4" /> สรุปยอดรวม
              </button>
              <button onClick={() => setActiveMenu('rates')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${activeMenu === 'rates' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <Coins className="w-4 h-4" /> ตั้งค่าอัตราจ่าย
              </button>
              <button onClick={() => setActiveMenu('limits')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${activeMenu === 'limits' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <Ban className="w-4 h-4" /> จัดการเลขอั้น
              </button>
              <button onClick={() => setActiveMenu('results')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${activeMenu === 'results' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <Trophy className="w-4 h-4" /> ประกาศผลรางวัล
              </button>
            </div>

            <div className="flex items-center gap-4 px-4 border-l border-gray-700/50">
               <div className="text-sm font-bold text-gray-300">Admin_01</div>
               <button 
                 onClick={() => {
                   localStorage.removeItem('admin_auth');
                   setIsAdminAuthenticated(false);
                 }}
                 className="bg-red-900/30 text-red-400 hover:bg-red-900/50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors active:scale-95"
               >
                 ออกจากระบบ
               </button>
            </div>
          </div>

          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Date Filter */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-yellow-400">ภาพรวมการรับแทง</h3>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">เลือกวันที่: </span>
                  <ThaiDatePicker value={selectedDate} onChange={setSelectedDate} />
                </div>
              </div>
              
              {dashboardStats.hasResults && dashboardStats.winningNumbers && (
                <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-600/10 to-transparent backdrop-blur-md border border-yellow-500/30 p-4 md:p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between shadow-xl mb-6">
                  <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <div className="bg-yellow-500/20 p-3 rounded-2xl">
                      <Trophy className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-yellow-200 text-sm font-bold">ผลรางวัลประจำงวด</div>
                      <div className="text-yellow-400 font-black text-lg md:text-xl">{selectedDate}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-end w-full md:w-auto">
                    <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black px-5 py-3 rounded-2xl font-black text-2xl flex flex-col items-center shadow-[0_0_15px_rgba(234,179,8,0.4)] flex-1 md:flex-none">
                      <span className="text-[10px] uppercase tracking-wider opacity-80 mb-1">3 ตัวบน</span>
                      {dashboardStats.winningNumbers["3TOP"]}
                    </div>
                    <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black px-5 py-3 rounded-2xl font-black text-2xl flex flex-col items-center shadow-[0_0_15px_rgba(234,179,8,0.4)] flex-1 md:flex-none">
                      <span className="text-[10px] uppercase tracking-wider opacity-80 mb-1">2 ตัวล่าง</span>
                      {dashboardStats.winningNumbers["2BOT"]}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-blue-600/20 to-blue-900/40 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-blue-500/30 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                  <div className="text-blue-300 text-sm font-bold mb-2 flex items-center gap-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg"><BarChart3 className="w-4 h-4 text-blue-400" /></div>
                    ยอดแทงรวมวันนี้
                  </div>
                  <div className="text-3xl lg:text-4xl font-black text-white mt-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">฿ {dashboardStats.totalAmount.toLocaleString()}</div>
                </div>

                {dashboardStats.hasResults ? (
                  <>
                    <div className="col-span-1 bg-gradient-to-br from-red-600/20 to-red-900/40 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-red-500/30 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                      <div className="text-red-300 text-xs md:text-sm font-bold mb-2">ยอดเงินจ่าย</div>
                      <div className="text-xl lg:text-3xl font-black text-red-400 mt-2">฿ {dashboardStats.totalPayout.toLocaleString()}</div>
                    </div>
                    <div className={`col-span-1 bg-gradient-to-br ${dashboardStats.netProfit >= 0 ? 'from-green-600/20 to-green-900/40 border-green-500/30' : 'from-red-600/20 to-red-900/40 border-red-500/30'} backdrop-blur-md p-6 rounded-3xl shadow-xl border flex flex-col justify-between hover:scale-[1.02] transition-transform`}>
                      <div className="text-gray-300 text-xs md:text-sm font-bold mb-2">กำไรสุทธิ</div>
                      <div className={`text-xl lg:text-3xl font-black ${dashboardStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'} mt-2`}>
                        {dashboardStats.netProfit >= 0 ? '+' : '-'} ฿ {Math.abs(dashboardStats.netProfit).toLocaleString()}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 md:col-span-2 bg-gradient-to-br from-purple-600/20 to-purple-900/40 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-purple-500/30 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                    <div className="text-purple-300 text-sm font-bold mb-2 flex items-center gap-2">
                      <div className="p-2 bg-purple-500/20 rounded-lg"><Coins className="w-4 h-4 text-purple-400" /></div>
                      กำไร (คาดการณ์ 30%)
                    </div>
                    <div className="text-3xl lg:text-4xl font-black text-green-400 mt-4 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">+ ฿ {dashboardStats.estimatedProfit.toLocaleString()}</div>
                  </div>
                )}

                <div className={`${dashboardStats.hasResults ? 'col-span-2 md:col-span-1' : 'col-span-2 md:col-span-1'} bg-gradient-to-br from-gray-700/20 to-gray-900/40 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-gray-600/30 flex flex-col justify-between hover:scale-[1.02] transition-transform`}>
                  <div className="text-gray-400 text-sm font-bold mb-2">บิลทั้งหมด</div>
                  <div className="text-3xl lg:text-4xl font-black text-white mt-4">{dashboardStats.totalSlips.toLocaleString()} <span className="text-base font-normal text-gray-400">โพย</span></div>
                </div>
              </div>

              <div className="bg-[#1e293b]/60 backdrop-blur-xl p-4 md:p-6 rounded-3xl shadow-xl border border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-orange-500/20 p-2 rounded-xl">
                    <span className="text-xl">🔥</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">เลขมาแรง</h3>
                </div>
                <div className="w-full">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-400 text-xs md:text-sm border-b border-gray-700">
                        <th className="pb-3 w-[30%]">ตัวเลข</th>
                        <th className="pb-3 w-[40%] text-center">ยอดแทง</th>
                        <th className="pb-3 w-[30%] text-right">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {hotNumbers.length === 0 ? (
                        <tr><td colSpan={3} className="py-8 text-center text-gray-500">ยังไม่มีข้อมูลการแทงในวันที่เลือก</td></tr>
                      ) : (
                        (() => {
                          const renderGroups: React.ReactNode[] = [];
                          let currentMode = '';
                          hotNumbers.forEach((hot, idx) => {
                            if (hot.mode !== currentMode) {
                              currentMode = hot.mode;
                              renderGroups.push(
                                <tr key={`group-${currentMode}`} className="bg-blue-900/20">
                                  <td colSpan={3} className="py-2 px-3 font-bold text-blue-400 rounded-lg whitespace-nowrap">
                                    # {currentMode} <span className="text-xs text-blue-300 ml-1 font-normal">(จ่าย {rates[currentMode] || 0})</span>
                                  </td>
                                </tr>
                              );
                            }
                            const isLimited = limits.some(l => l.number_bet === hot.digits && l.bet_type === hot.mode);
                            renderGroups.push(
                              <tr key={`item-${idx}`} className="border-b border-gray-800/50 last:border-0">
                                <td className="py-3 px-2 font-bold text-base md:text-lg text-white leading-tight">
                                  {hot.digits}
                                  {isLimited && <span className="ml-1 md:ml-2 bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold uppercase">อั้น</span>}
                                  {hot.mode === '3 ตัวโต๊ด' && hot.is_win && dashboardStats.winningNumbers?.["3TOP"] && (
                                    <div className="text-[10px] md:text-xs text-gray-400 font-normal mt-0.5 leading-tight whitespace-nowrap">
                                      ({(() => {
                                         const str = dashboardStats.winningNumbers["3TOP"];
                                         const perms = new Set<string>();
                                         const arr = str.split('');
                                         for(let i=0;i<3;i++) for(let j=0;j<3;j++) for(let k=0;k<3;k++) {
                                           if (i!==j && i!==k && j!==k) perms.add(arr[i]+arr[j]+arr[k]);
                                         }
                                         perms.delete(str);
                                         return Array.from(perms).join(',');
                                      })()})
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-2 font-bold text-yellow-400 text-sm md:text-base text-center">฿ {hot.total_amount.toLocaleString()}</td>
                                <td className="py-3 px-2 text-right whitespace-nowrap">
                                  {hot.is_win ? (
                                    <span className="text-red-400 font-bold text-xs md:text-sm bg-red-900/20 px-2 py-1 rounded-lg whitespace-nowrap inline-block">
                                      ชนะ ฿{hot.total_payout.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-gray-600 font-medium text-xs md:text-sm inline-block">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                          return renderGroups;
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RATES SETTING */}
          {activeMenu === 'rates' && (
            <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-gray-800">
               <h3 className="text-lg font-bold mb-4 text-yellow-400">ตั้งค่าอัตราจ่ายมาตรฐาน</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(rates).filter(mode => mode !== 'GLOBAL_MAX_BET').map(mode => (
                  <div key={mode} className="bg-[#0f172a] p-4 rounded-xl flex justify-between items-center border border-gray-700">
                    <div className="font-bold">{mode}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">จ่ายละ</span>
                      <input type="number" value={rates[mode]} onChange={(e) => setRates({...rates, [mode]: Number(e.target.value)})} className="w-24 bg-gray-800 p-2 rounded text-right font-bold text-yellow-400 outline-none focus:border-blue-500 border border-transparent" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-gray-800 pt-6 flex flex-col items-center">
                <button onClick={handleSaveRates} className="w-full md:w-auto bg-green-600 hover:bg-green-500 px-12 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(22,163,74,0.3)] text-lg">
                  บันทึกราคา
                </button>
                {saveSuccess && <span className="text-green-400 font-bold mt-3 animate-pulse">บันทึกสำเร็จ! ✔️</span>}
              </div>
            </div>
          )}

          {/* LIMITS SETTING */}
          {activeMenu === 'limits' && (
            <div className="space-y-6">
              
              {/* Global Limit Setting */}
              <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-gray-800">
                <h3 className="text-lg font-bold mb-2 text-yellow-400">รับยอดสูงสุด (ต่อตัว)</h3>
                <p className="text-gray-400 text-sm mb-4">ตั้งค่าเพื่อไม่ให้ยอดแทงเลขใดเลขหนึ่งเกินกำหนด (ลดความเสี่ยง)</p>
                <div className="flex items-center justify-between">
                  <div className="bg-[#0f172a] p-2 px-4 rounded-xl flex items-center gap-2 border border-gray-700">
                    <span className="text-gray-400">รับไม่เกิน</span>
                    <input 
                      type="number" 
                      value={rates['GLOBAL_MAX_BET']} 
                      onChange={(e) => setRates({...rates, 'GLOBAL_MAX_BET': Number(e.target.value)})} 
                      className="w-24 bg-gray-800 p-2 rounded text-right font-bold text-white outline-none focus:border-blue-500 border border-transparent" 
                    />
                    <span className="text-gray-400">บาท / ตัว</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={handleSaveRates} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-bold transition-colors">
                      บันทึกยอดอั้น
                    </button>
                    {saveSuccess && <span className="text-green-400 font-bold">บันทึกสำเร็จ! ✔️</span>}
                  </div>
                </div>
              </div>

              {/* Specific Limits */}
              <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-yellow-400">จัดการเลขอั้นรายตัว</h3>
                    <p className="text-gray-400 text-sm mt-1">ตั้งค่าจ่ายครึ่งราคา หรือ ปิดรับแทงเฉพาะบางเลข</p>
                  </div>
                  <button onClick={() => setShowLimitModal(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold text-sm shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                    + เพิ่มเลขอั้น
                  </button>
                </div>

                <div className="w-full">
                  <div className="flex items-center text-gray-400 text-xs md:text-sm font-bold border-b border-gray-700 pb-3 mb-3 px-2">
                    <div className="flex-1">ตัวเลข</div>
                    <div className="flex-1 text-center">สถานะ</div>
                    <div className="w-10 text-center">ลบ</div>
                  </div>
                  {limits.length === 0 ? (
                    <div className="text-gray-500 py-8 text-center bg-[#0f172a] rounded-xl border border-gray-800">
                      ยังไม่มีการตั้งเลขอั้นรายตัว
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {limits.map(limit => (
                        <div key={limit.limit_id} className="bg-[#0f172a] p-3 md:p-4 rounded-xl flex items-center border border-gray-700 transition-all hover:border-gray-600">
                          <div className="flex-1">
                            <div className="font-bold text-yellow-400 text-base md:text-lg leading-none mb-1">{limit.number_bet}</div>
                            <div className="text-[10px] md:text-sm text-gray-400 leading-none">{limit.bet_type}</div>
                          </div>
                          <div className="flex-1 flex justify-center">
                            {Number(limit.max_accept_limit) === 0 ? (
                              <div className="text-red-400 font-bold bg-red-900/30 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-sm whitespace-nowrap">เต็ม (ปิดรับ)</div>
                            ) : (
                              <div className="text-orange-400 font-bold bg-orange-900/30 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-sm whitespace-nowrap">ครึ่ง (เรท {limit.payout_rate})</div>
                            )}
                          </div>
                          <div className="w-10 flex justify-end md:justify-center">
                            <button 
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirmingLimitId === limit.limit_id) {
                                  setConfirmingLimitId(null);
                                  const { error } = await supabase.from('LIMITS_AND_RATES').delete().eq('limit_id', limit.limit_id);
                                  if (!error) fetchData();
                                } else {
                                  setConfirmingLimitId(limit.limit_id);
                                  setTimeout(() => setConfirmingLimitId(null), 3000);
                                }
                              }}
                              className={`font-bold p-2 rounded-lg active:scale-95 transition-all flex items-center justify-center relative z-50 ${confirmingLimitId === limit.limit_id ? 'bg-red-600 text-white' : 'text-red-400 hover:text-red-300 hover:bg-red-900/40 bg-red-900/20'}`}
                            >
                              {confirmingLimitId === limit.limit_id ? <span className="text-xs px-1 whitespace-nowrap">ยืนยัน?</span> : <Trash2 className="w-4 h-4 md:w-5 md:h-5 pointer-events-none" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* RESULTS SETTING */}
          {activeMenu === 'results' && (
            <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-gray-800">
              <h3 className="text-xl font-bold mb-6 text-yellow-400 text-center">🏆 ประกาศผลรางวัลประจำงวด</h3>
              
              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <label className="block text-gray-400 mb-2 font-bold">วันที่ออกรางวัล:</label>
                  <ThaiDatePicker value={drawDate} onChange={setDrawDate} />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 font-bold">รางวัล 3 ตัวบน:</label>
                  <input 
                    type="text" 
                    maxLength={3}
                    value={result3Top} 
                    onChange={e => setResult3Top(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="เช่น 123" 
                    className="w-full bg-[#0f172a] p-4 rounded-xl border border-gray-700 focus:border-yellow-400 outline-none text-white font-bold text-2xl text-center tracking-widest" 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2 font-bold">รางวัล 2 ตัวล่าง:</label>
                  <input 
                    type="text" 
                    maxLength={2}
                    value={result2Bottom} 
                    onChange={e => setResult2Bottom(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="เช่น 45" 
                    className="w-full bg-[#0f172a] p-4 rounded-xl border border-gray-700 focus:border-yellow-400 outline-none text-white font-bold text-2xl text-center tracking-widest" 
                  />
                </div>

                <button onClick={handleSaveResults} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 font-bold py-4 rounded-xl mt-8 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.4)] text-lg">
                  ประกาศผลรางวัล
                </button>
              </div>

              <div className="mt-12 border-t border-gray-700 pt-8">
                <h3 className="text-lg font-bold mb-4 text-yellow-400">📜 ประวัติการประกาศผลรางวัล</h3>
                <div className="bg-[#0f172a] rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#1e293b] border-b border-gray-700 text-xs md:text-sm">
                      <tr>
                        <th className="px-2 py-3 md:p-4 text-gray-400 font-bold whitespace-nowrap">วันที่</th>
                        <th className="px-2 py-3 md:p-4 text-gray-400 font-bold text-center whitespace-nowrap">3 บน</th>
                        <th className="px-2 py-3 md:p-4 text-gray-400 font-bold text-center whitespace-nowrap">2 ล่าง</th>
                        <th className="px-2 py-3 md:p-4 text-gray-400 font-bold text-center whitespace-nowrap">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm md:text-base">
                      {drawHistory.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">ยังไม่มีประวัติการประกาศผล</td></tr>
                      ) : (
                        drawHistory.map(draw => (
                          <tr key={draw.draw_id} className="border-b border-gray-800 hover:bg-[#1e293b]/50 transition-colors">
                            <td className="px-2 py-3 md:p-4 font-bold whitespace-nowrap">{draw.draw_date}</td>
                            <td className="px-2 py-3 md:p-4 text-center text-lg md:text-xl font-bold text-yellow-400 whitespace-nowrap">{draw.winning_numbers?.["3TOP"] || '-'}</td>
                            <td className="px-2 py-3 md:p-4 text-center text-lg md:text-xl font-bold text-yellow-400 whitespace-nowrap">{draw.winning_numbers?.["2BOT"] || '-'}</td>
                            <td className="px-2 py-3 md:p-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDrawDate(draw.draw_date);
                                    setResult3Top(draw.winning_numbers?.["3TOP"] || '');
                                    setResult2Bottom(draw.winning_numbers?.["2BOT"] || '');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 p-1.5 md:p-2 rounded-lg transition-colors inline-flex items-center justify-center active:scale-95 relative z-50"
                                >
                                  <Edit className="w-4 h-4 md:w-5 md:h-5 pointer-events-none" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (confirmingDrawId === draw.draw_id) {
                                      setConfirmingDrawId(null);
                                      const { error } = await supabase.from('DRAWS').delete().eq('draw_id', draw.draw_id);
                                      if (!error) {
                                        await fetchDrawHistory();
                                        await fetchDashboardData();
                                      }
                                    } else {
                                      setConfirmingDrawId(draw.draw_id);
                                      setTimeout(() => setConfirmingDrawId(null), 3000);
                                    }
                                  }}
                                  className={`p-1.5 md:p-2 rounded-lg transition-colors inline-flex items-center justify-center active:scale-95 relative z-50 ${confirmingDrawId === draw.draw_id ? 'bg-red-600 text-white font-bold' : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'}`}
                                >
                                  {confirmingDrawId === draw.draw_id ? <span className="text-xs px-1 whitespace-nowrap">ยืนยัน?</span> : <Trash2 className="w-4 h-4 md:w-5 md:h-5 pointer-events-none" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#1e293b]/80 backdrop-blur-xl border-t border-gray-800 flex justify-around pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] px-2 z-[40]">
        <button onClick={() => setActiveMenu('dashboard')} className={`flex flex-col items-center w-1/4 active:scale-95 transition-transform ${activeMenu === 'dashboard' ? 'text-blue-400' : 'text-gray-500'}`}>
          <BarChart3 className={`w-6 h-6 ${activeMenu === 'dashboard' ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : ''}`} />
          <span className="text-[10px] mt-1 font-bold">สรุปยอด</span>
        </button>
        <button onClick={() => setActiveMenu('rates')} className={`flex flex-col items-center w-1/4 active:scale-95 transition-transform ${activeMenu === 'rates' ? 'text-blue-400' : 'text-gray-500'}`}>
          <Coins className={`w-6 h-6 ${activeMenu === 'rates' ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : ''}`} />
          <span className="text-[10px] mt-1 font-bold">อัตราจ่าย</span>
        </button>
        <button onClick={() => setActiveMenu('limits')} className={`flex flex-col items-center w-1/4 active:scale-95 transition-transform ${activeMenu === 'limits' ? 'text-blue-400' : 'text-gray-500'}`}>
          <Ban className={`w-6 h-6 ${activeMenu === 'limits' ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : ''}`} />
          <span className="text-[10px] mt-1 font-bold">เลขอั้น</span>
        </button>
        <button onClick={() => setActiveMenu('results')} className={`flex flex-col items-center w-1/4 active:scale-95 transition-transform ${activeMenu === 'results' ? 'text-blue-400' : 'text-gray-500'}`}>
          <Trophy className={`w-6 h-6 ${activeMenu === 'results' ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : ''}`} />
          <span className="text-[10px] mt-1 font-bold">ผลรางวัล</span>
        </button>
      </div>

      {/* MODAL: เพิ่มเลขอั้นใหม่ */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-[60]">
          <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setShowLimitModal(false); setNewLimitDigits(''); }} className="absolute top-4 right-4 text-gray-500 hover:text-white font-bold text-xl">&times;</button>
            <h3 className="text-xl font-bold text-yellow-400 mb-6">➕ เพิ่มเลขอั้น / เลขเต็ม</h3>
            
            <div className="space-y-4 text-sm font-bold">
              
              <div>
                <label className="block text-gray-400 mb-1">หมวดหมู่หวย:</label>
                <select value={newLimitMode} onChange={e => { setNewLimitMode(e.target.value); setNewLimitDigits(''); }} className="w-full bg-[#0f172a] p-3 rounded-lg border border-gray-700 focus:border-yellow-400 outline-none text-white font-medium">
                  <option value="3 ตัวบน">3 ตัวบน</option>
                  <option value="3 ตัวโต๊ด">3 ตัวโต๊ด</option>
                  <option value="2 ตัวบน">2 ตัวบน</option>
                  <option value="2 ตัวล่าง">2 ตัวล่าง</option>
                  <option value="วิ่งบน">วิ่งบน</option>
                  <option value="วิ่งล่าง">วิ่งล่าง</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">ตัวเลขที่ต้องการอั้น:</label>
                
                {/* OTP Style Inputs */}
                <div className="flex justify-center gap-3 py-3 bg-[#0f172a] rounded-xl mb-4 border border-blue-900/50 shadow-inner">
                  {Array.from({ length: newLimitMode.includes('3') ? 3 : (newLimitMode.includes('2') ? 2 : 1) }).map((_, i) => (
                    <div key={i} className={`w-14 h-16 rounded-xl flex items-center justify-center text-3xl font-bold border-2 transition-all duration-300 ${newLimitDigits[i] ? 'border-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] scale-110' : 'border-blue-900/50 text-gray-600 scale-100'}`}>
                      {newLimitDigits[i] || '-'}
                    </div>
                  ))}
                </div>

                {/* Numpad */}
                <div className="bg-[#0f172a]/60 p-3 rounded-2xl border border-blue-900/50 max-w-[280px] mx-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button 
                        key={num}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          const maxLen = newLimitMode.includes('3') ? 3 : (newLimitMode.includes('2') ? 2 : 1);
                          if (newLimitDigits.length < maxLen) setNewLimitDigits(prev => prev + num);
                        }}
                        className="bg-blue-950/80 border border-blue-800 text-white text-xl font-medium py-3 rounded-xl active:bg-blue-800 transition-colors"
                      >
                        {num}
                      </button>
                    ))}
                    <button type="button" onPointerDown={(e) => { e.preventDefault(); setNewLimitDigits(''); }} className="bg-red-900/20 text-red-400 text-sm font-bold py-3 rounded-xl active:bg-red-900/50">
                      Clear
                    </button>
                    <button type="button" onPointerDown={(e) => {
                          e.preventDefault();
                          const maxLen = newLimitMode.includes('3') ? 3 : (newLimitMode.includes('2') ? 2 : 1);
                          if (newLimitDigits.length < maxLen) setNewLimitDigits(prev => prev + '0');
                        }} className="bg-blue-950/80 border border-blue-800 text-white text-xl font-medium py-3 rounded-xl active:bg-blue-800 transition-colors">
                      0
                    </button>
                    <button type="button" onPointerDown={(e) => { e.preventDefault(); setNewLimitDigits(prev => prev.slice(0, -1)); }} className="bg-blue-900/40 border border-blue-800/50 text-yellow-500 flex justify-center items-center py-3 rounded-xl active:bg-blue-800">
                      <div className="bg-yellow-600 text-black rounded px-2 py-1 text-xs font-bold">⌫</div>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 mt-4">ประเภทการอั้น:</label>
                <select value={newLimitType} onChange={e => setNewLimitType(e.target.value)} className="w-full bg-[#0f172a] p-3 rounded-lg border border-gray-700 focus:border-yellow-400 outline-none text-white font-medium">
                  <option value="blocked">ปิดรับแทงเลย (เลขเต็ม)</option>
                  <option value="half_price">จ่ายครึ่งราคา (เลขอั้น)</option>
                </select>
              </div>

              {newLimitType === 'half_price' && (
                <div>
                  <label className="block text-gray-400 mb-1">เรทอัตราจ่ายใหม่ (จ่ายครึ่ง):</label>
                  <input type="number" value={newLimitRate} onChange={e => setNewLimitRate(e.target.value)} placeholder="เช่น 450" className="w-full bg-[#0f172a] p-3 rounded-lg border border-gray-700 focus:border-yellow-400 outline-none text-white font-medium" />
                </div>
              )}

              <button onClick={handleAddLimit} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-4 transition-colors shadow-lg active:scale-95">
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
