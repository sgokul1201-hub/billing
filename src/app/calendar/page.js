'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdfHelper';
import BottomNav from '@/components/BottomNav';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  FileText, 
  Download, 
  Trash2, 
  User, 
  ShoppingBag,
  TrendingUp
} from 'lucide-react';

export default function CalendarPage() {
  const [shop, setShop] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [salesByDate, setSalesByDate] = useState({}); // YYYY-MM-DD -> [sales]
  const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM-DD
  const [selectedDaySales, setSelectedDaySales] = useState([]);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  useEffect(() => {
    if (selectedDate) {
      setSelectedDaySales(salesByDate[selectedDate] || []);
    }
  }, [selectedDate, salesByDate]);

  const loadCalendarData = async () => {
    const shopDetails = await db.shop.get(1);
    setShop(shopDetails);

    // Fetch all sales for this month range
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    
    // Start of month
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    // End of month
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const salesList = await db.sales
      .where('date')
      .between(startOfMonth, endOfMonth, true, true)
      .toArray();

    // Group sales by YYYY-MM-DD
    const grouped = {};
    salesList.forEach(sale => {
      const dateStr = sale.date;
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(sale);
    });

    setSalesByDate(grouped);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const handleDownloadPDF = (sale) => {
    if (!shop) return;
    generateInvoicePDF(sale, shop);
  };

  const handleDeleteInvoice = async (id, invNum) => {
    if (confirm(`Are you sure you want to delete Invoice ${invNum}?`)) {
      await db.sales.delete(id);
      loadCalendarData();
    }
  };

  // Generate calendar grid
  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Day of the week the month starts on
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
    
    // Number of days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();

    const dayCells = [];

    // Empty spaces for previous month's overlapping days
    for (let i = 0; i < firstDayIndex; i++) {
      dayCells.push(<div key={`empty-${i}`} className="calendar-day-empty" style={{ opacity: 0.15 }}></div>);
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const daySales = salesByDate[dateKey] || [];
      const saleCount = daySales.length;
      const totalRevenue = daySales.reduce((sum, item) => sum + item.grandTotal, 0);

      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      const isSelected = selectedDate === dateKey;

      dayCells.push(
        <div 
          key={day} 
          onClick={() => setSelectedDate(dateKey)}
          style={{
            minHeight: '65px',
            padding: '8px',
            borderRadius: '12px',
            border: isSelected ? '2.5px solid var(--primary)' : '1px solid var(--border-color)',
            background: isSelected 
              ? 'var(--primary-glow)' 
              : isToday 
                ? 'var(--bg-btn-secondary)' 
                : 'var(--bg-card-subtle)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          className="calendar-day-cell"
        >
          <span style={{ 
            fontSize: '0.85rem', 
            fontWeight: '700', 
            color: isToday ? 'var(--primary)' : 'var(--text-primary)' 
          }}>
            {day}
            {isToday && (
              <span style={{ 
                width: '4px', 
                height: '4px', 
                background: 'var(--primary)', 
                borderRadius: '50%', 
                display: 'inline-block', 
                marginLeft: '4px', 
                verticalAlign: 'middle' 
              }}></span>
            )}
          </span>

          {saleCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '2px', marginTop: '4px' }}>
              <span 
                className="badge badge-primary" 
                style={{ 
                  padding: '1px 5px', 
                  fontSize: '0.65rem', 
                  width: 'fit-content',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: 'white',
                  border: 'none'
                }}
              >
                {saleCount} {saleCount === 1 ? 'sale' : 'sales'}
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--success)' }}>
                ₹{Math.round(totalRevenue)}
              </span>
            </div>
          )}
        </div>
      );
    }

    return dayCells;
  };

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="app-container page-fade-in">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="app-title">Sales Calendar</h1>
        </div>
        <ThemeToggle />
      </header>

      <main style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Month Selector header card */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px' }}>
          <button onClick={handlePrevMonth} className="btn btn-secondary" style={{ width: 'auto', padding: '8px 12px', borderRadius: '8px' }}>
            <ChevronLeft size={18} />
          </button>
          
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={18} style={{ color: 'var(--primary)' }} />
            {monthName}
          </h2>

          <button onClick={handleNextMonth} className="btn btn-secondary" style={{ width: 'auto', padding: '8px 12px', borderRadius: '8px' }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Calendar Grid Container */}
        <div className="glass-card" style={{ padding: '15px' }}>
          
          {/* Weekday Labels */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            textAlign: 'center', 
            marginBottom: '10px',
            fontSize: '0.75rem', 
            fontWeight: '700', 
            color: 'var(--text-muted)' 
          }}>
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '8px' 
          }}>
            {renderCalendarGrid()}
          </div>
        </div>

        {/* Selected Date Transaction Details Drawer */}
        {selectedDate && (
          <div className="glass-card page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px', border: '1px solid var(--border-color-glow)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>
                  Transactions for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Total: {selectedDaySales.length} Invoices
                </span>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.8rem', fontWeight: '700' }}>
                ₹{selectedDaySales.reduce((sum, item) => sum + item.grandTotal, 0).toFixed(2)}
              </span>
            </div>

            {selectedDaySales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No sales recorded for this date.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedDaySales.map((sale) => (
                  <div 
                    key={sale.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)'
                      }}>
                        <ShoppingBag size={14} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{sale.customerName || 'Walk-in'}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-btn-secondary)', padding: '2px 4px', borderRadius: '4px' }}>
                            {sale.invoiceNumber}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Time: {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                        ₹{sale.grandTotal.toFixed(2)}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => handleDownloadPDF(sale)}
                          style={{
                            background: 'rgba(99,102,241,0.1)',
                            border: 'none',
                            color: 'var(--primary)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Download PDF"
                        >
                          <Download size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteInvoice(sale.id, sale.invoiceNumber)}
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: 'none',
                            color: 'var(--danger)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Delete Invoice"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  );
}
