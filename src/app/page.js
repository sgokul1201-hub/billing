'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdfHelper';
import BottomNav from '@/components/BottomNav';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  TrendingUp, 
  FileText, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Award, 
  Plus, 
  Download, 
  Trash2, 
  Search, 
  TrendingDown,
  CreditCard,
  Share2
} from 'lucide-react';

export default function Dashboard() {
  const [shop, setShop] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCount: 0,
    averageValue: 0,
    peakDate: 'N/A',
    peakDateAmount: 0,
    totalExpenses: 0,
    netProfit: 0
  });
  const [chartData, setChartData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // 1. Load Shop details
    const shopDetails = await db.shop.get(1);
    setShop(shopDetails);

    // 2. Load all sales
    const allSales = await db.sales.orderBy('timestamp').reverse().toArray();
    setInvoices(allSales);

    // 3. Calculate Stats & Expenses
    let totalRev = 0;
    let totalCount = 0;
    let averageValue = 0;
    let formattedPeakDate = 'N/A';
    let peakDateAmount = 0;

    const allExpenses = await db.expenses.toArray();
    const totalExp = allExpenses.reduce((sum, item) => sum + item.amount, 0);

    if (allSales.length > 0) {
      totalRev = allSales.reduce((sum, item) => sum + item.grandTotal, 0);
      totalCount = allSales.length;
      averageValue = totalRev / totalCount;

      // Calculate Peak Sale Date
      const dateMap = {};
      allSales.forEach(sale => {
        const dateStr = sale.date; // YYYY-MM-DD
        dateMap[dateStr] = (dateMap[dateStr] || 0) + sale.grandTotal;
      });

      let peakDate = 'N/A';
      Object.keys(dateMap).forEach(date => {
        if (dateMap[date] > peakDateAmount) {
          peakDateAmount = dateMap[date];
          peakDate = date;
        }
      });

      if (peakDate !== 'N/A') {
        const dateObj = new Date(peakDate);
        formattedPeakDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    setStats({
      totalRevenue: totalRev,
      totalCount,
      averageValue,
      peakDate: formattedPeakDate,
      peakDateAmount,
      totalExpenses: totalExp,
      netProfit: totalRev - totalExp
    });

    // 4. Generate 7-Day Chart Data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const displayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      last7Days.push({ dateStr, label: displayStr, amount: 0 });
    }

    allSales.forEach(sale => {
      const index = last7Days.findIndex(day => day.dateStr === sale.date);
      if (index !== -1) {
        last7Days[index].amount += sale.grandTotal;
      }
    });

    setChartData(last7Days);
  };

  const handleDownloadPDF = (invoice) => {
    if (!shop) return;
    generateInvoicePDF(invoice, shop, 'download');
  };

  const handleSharePDF = (invoice) => {
    if (!shop) return;
    generateInvoicePDF(invoice, shop, 'share');
  };

  const handleDeleteInvoice = async (id, invNum) => {
    if (confirm(`Are you sure you want to delete Invoice ${invNum}? This action cannot be undone.`)) {
      await db.sales.delete(id);
      loadDashboardData();
    }
  };

  // Filtered Invoices based on search
  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase();
    return (
      (inv.customerName && inv.customerName.toLowerCase().includes(query)) ||
      (inv.customerPhone && inv.customerPhone.includes(query)) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(query))
    );
  });

  // Calculate coordinates for SVG line chart
  const renderSVGChart = () => {
    if (chartData.length === 0) return null;
    const maxVal = Math.max(...chartData.map(d => d.amount), 100);
    const height = 140;
    const width = 500;
    const padding = { top: 15, bottom: 25, left: 15, right: 15 };

    const points = chartData.map((d, index) => {
      const x = padding.left + (index * (width - padding.left - padding.right)) / (chartData.length - 1);
      const y = height - padding.bottom - (d.amount / maxVal) * (height - padding.top - padding.bottom);
      return { x, y, label: d.label, amount: d.amount };
    });

    const linePath = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    // Closed path for the filled gradient area
    const areaPath = `
      ${linePath} 
      L ${points[points.length - 1].x} ${height - padding.bottom} 
      L ${points[0].x} ${height - padding.bottom} Z
    `;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="chart-svg">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines (horizontal) */}
        {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = height - padding.bottom - ratio * (height - padding.top - padding.bottom);
          return (
            <line 
              key={idx} 
              x1={padding.left} 
              y1={y} 
              x2={width - padding.right} 
              y2={y} 
              stroke="var(--border-color)" 
              strokeDasharray="4 4" 
            />
          );
        })}

        {/* Filled gradient area */}
        <path d={areaPath} fill="url(#chartGrad)" />

        {/* Glowing stroke path */}
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Interactive Dots and values */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="var(--primary)" strokeWidth="2.5" />
            {p.amount > 0 && (
              <text 
                x={p.x} 
                y={p.y - 8} 
                textAnchor="middle" 
                fontSize="9" 
                fontWeight="700" 
                fill="var(--text-primary)"
              >
                ₹{Math.round(p.amount)}
              </text>
            )}
            <text 
              x={p.x} 
              y={height - 8} 
              textAnchor="middle" 
              fontSize="10" 
              fontWeight="600" 
              fill="var(--text-muted)"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="app-container page-fade-in">
      
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          {shop?.logo ? (
            <img src={shop.logo} alt="Logo" className="logo-img" />
          ) : (
            <div className="logo-fallback">
              {shop?.shopName ? shop.shopName.charAt(0).toUpperCase() : 'S'}
            </div>
          )}
          <div>
            <h1 className="app-title">{shop?.shopName || 'Billing App'}</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Welcome, {shop?.ownerName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/billing" className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '0.85rem', width: 'auto', borderRadius: '12px' }}>
            <Plus size={16} /> New Bill
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          
          <div className="glass-card" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--primary-glow)', padding: '8px', borderRadius: '10px', color: 'var(--primary)' }}>
              <DollarSign size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Gross Sales</p>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Rs. {stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '10px', color: 'var(--danger)' }}>
              <TrendingDown size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Expenses</p>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Rs. {stats.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
            </div>
          </div>

          <div className="glass-card" style={{ 
            padding: '12px 15px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            border: stats.netProfit >= 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <div style={{ 
              background: stats.netProfit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
              padding: '8px', 
              borderRadius: '10px', 
              color: stats.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' 
            }}>
              <CreditCard size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Net Profit</p>
              <h3 style={{ 
                fontSize: '1.05rem', 
                fontWeight: '700', 
                color: stats.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' 
              }}>
                Rs. {stats.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '8px', borderRadius: '10px', color: 'var(--secondary)' }}>
              <FileText size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Sales Count</p>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{stats.totalCount} Bills</h3>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '10px', color: 'var(--success)' }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Average Ticket</p>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Rs. {stats.averageValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '10px', color: 'var(--warning)' }}>
              <Award size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Peak Date</p>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '700', wordBreak: 'break-word' }}>{stats.peakDate}</h3>
              {stats.peakDateAmount > 0 && (
                <p style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: '600' }}>Rs. {stats.peakDateAmount.toFixed(2)}</p>
              )}
            </div>
          </div>

        </div>

        {/* Sales Chart Section */}
        <div className="glass-card" style={{ padding: '20px 15px' }}>
          <h2 className="section-title" style={{ fontSize: '1.05rem', marginBottom: '15px' }}>
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> 7-Day Sales Trend
          </h2>
          {invoices.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '0.85rem' }}>
              No billing data recorded yet. Create a bill to see charts.
            </div>
          ) : (
            renderSVGChart()
          )}
        </div>

        {/* Transactions List */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="section-title" style={{ fontSize: '1.05rem', margin: 0 }}>
              <FileText size={18} style={{ color: 'var(--primary)' }} /> Invoices
            </h2>
            <div style={{ position: 'relative', width: '150px' }}>
              <input
                type="text"
                placeholder="Search..."
                className="form-input"
                style={{ padding: '6px 12px 6px 28px', fontSize: '0.8rem', borderRadius: '8px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0', fontSize: '0.85rem' }}>
              {searchQuery ? "No invoices match search." : "No bills created yet."}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredInvoices.slice(0, 8).map((inv) => (
                <div 
                  key={inv.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--primary-glow)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)'
                    }}>
                      <User size={16} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{inv.customerName || 'Walk-in'}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-btn-secondary)', padding: '2px 5px', borderRadius: '4px' }}>
                          {inv.invoiceNumber}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(inv.timestamp).toLocaleDateString()} at {new Date(inv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                      ₹{inv.grandTotal.toFixed(2)}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        onClick={() => handleDownloadPDF(inv)}
                        style={{
                          background: 'rgba(59,130,246,0.1)',
                          border: 'none',
                          color: 'var(--primary)',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => handleSharePDF(inv)}
                        style={{
                          background: 'rgba(6,182,212,0.1)',
                          border: 'none',
                          color: 'var(--secondary)',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Share Invoice"
                      >
                        <Share2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: 'none',
                          color: 'var(--danger)',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete Invoice"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredInvoices.length > 8 && (
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                  Showing latest 8 invoices. Use search to find older bills.
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* Floating Action Button */}
      <Link href="/billing" className="fab" title="Create Invoice">
        <Plus size={28} />
      </Link>

      <BottomNav />
    </div>
  );
}
