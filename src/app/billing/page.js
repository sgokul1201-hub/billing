'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdfHelper';
import BottomNav from '@/components/BottomNav';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  FileText, 
  Percent, 
  Receipt, 
  User, 
  Phone,
  Tag, 
  PlusCircle, 
  Sparkles,
  Search,
  BookOpen
} from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const [shop, setShop] = useState(null);
  
  // Invoice form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  
  // Selected items in current bill
  const [billItems, setBillItems] = useState([]);
  
  // Item custom insertion states
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemTax, setCustomItemTax] = useState('18'); // Default 18% tax
  const [customItemDiscount, setCustomItemDiscount] = useState('0'); // Default 0% discount
  const [customItemQty, setCustomItemQty] = useState('1');

  // Database saved catalog items
  const [catalogItems, setCatalogItems] = useState([]);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Built-in Toast notification states
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [formError, setFormError] = useState('');
  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Total summary states
  const [totals, setTotals] = useState({
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 0
  });

  useEffect(() => {
    loadBillingData();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [billItems]);

  const loadBillingData = async () => {
    const shopDetails = await db.shop.get(1);
    setShop(shopDetails);

    // Get catalog items
    const savedItems = await db.items.toArray();
    setCatalogItems(savedItems);

    // Auto-generate invoice number based on history count
    const invoiceCount = await db.sales.count();
    const nextInvoiceNumber = `INV-${String(invoiceCount + 1001).padStart(4, '0')}`;
    setInvoiceNumber(nextInvoiceNumber);

    // Set today's date
    setDate(new Date().toISOString().split('T')[0]);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    billItems.forEach(item => {
      const baseVal = item.price * item.quantity;
      const discVal = baseVal * (item.discountPercent / 100);
      const afterDisc = baseVal - discVal;
      const taxVal = afterDisc * (item.taxPercent / 100);

      subtotal += baseVal;
      discountTotal += discVal;
      taxTotal += taxVal;
    });

    const grandTotal = subtotal - discountTotal + taxTotal;

    setTotals({
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal
    });
  };

  const addCustomItem = (e) => {
    e.preventDefault();
    if (!customItemName || !customItemPrice) {
      setFormError("Please provide item name and price.");
      return;
    }
    setFormError('');

    const newItem = {
      id: Date.now() + Math.random(),
      name: customItemName,
      price: parseFloat(customItemPrice) || 0,
      taxPercent: parseFloat(customItemTax) || 0,
      discountPercent: parseFloat(customItemDiscount) || 0,
      quantity: parseInt(customItemQty) || 1
    };

    setBillItems([...billItems, newItem]);
    
    // Reset item input fields
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    setCustomItemDiscount('0');
  };

  const addCatalogItemToBill = (catalogItem) => {
    const existingIndex = billItems.findIndex(bi => bi.catalogId === catalogItem.id);
    
    if (existingIndex !== -1) {
      // Increase qty by 1
      const updated = [...billItems];
      updated[existingIndex].quantity += 1;
      setBillItems(updated);
    } else {
      // Add as new line item
      const newItem = {
        id: Date.now() + Math.random(),
        catalogId: catalogItem.id,
        name: catalogItem.name,
        price: catalogItem.price,
        taxPercent: catalogItem.taxPercent || 0,
        discountPercent: 0,
        quantity: 1
      };
      setBillItems([...billItems, newItem]);
    }
  };

  const handleQtyChange = (id, newQty) => {
    const updated = billItems.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, parseInt(newQty) || 1) };
      }
      return item;
    });
    setBillItems(updated);
  };

  const handleItemFieldChange = (id, field, value) => {
    const updated = billItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: parseFloat(value) || 0 };
      }
      return item;
    });
    setBillItems(updated);
  };

  const removeItem = (id) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };

  const saveCatalogItem = async (e) => {
    e.preventDefault();
    if (!customItemName || !customItemPrice) {
      setFormError("Please provide item name and price.");
      return;
    }
    setFormError('');
    
    const catalogItem = {
      name: customItemName,
      price: parseFloat(customItemPrice) || 0,
      taxPercent: parseFloat(customItemTax) || 0
    };

    await db.items.add(catalogItem);
    const updatedCatalog = await db.items.toArray();
    setCatalogItems(updatedCatalog);
    showToast("Item added to catalog library!", "success");
  };

  const handleSaveInvoice = async () => {
    if (billItems.length === 0) {
      showToast("Please add at least one item to generate a bill.", "error");
      return;
    }

    const saleRecord = {
      invoiceNumber,
      date,
      timestamp: Date.now(),
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      items: JSON.stringify(billItems),
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal
    };

    try {
      // 1. Save to Database
      const savedId = await db.sales.add(saleRecord);
      saleRecord.id = savedId;

      // 2. Generate PDF and Download
      generateInvoicePDF(saleRecord, shop);

      showToast("Invoice saved and PDF generated successfully!", "success");
      
      // 3. Reset form
      setCustomerName('');
      setCustomerPhone('');
      setBillItems([]);
      
      // Refresh invoice number
      loadBillingData();
      
      // Redirect to Dashboard
      router.push('/');
    } catch (err) {
      console.error("Failed to save sale:", err);
      showToast("Error saving invoice. Please try again.", "error");
    }
  };

  const filteredCatalogItems = catalogItems.filter(item =>
    item.name.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="app-container page-fade-in">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="app-title">Billing Desk</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button" 
            onClick={() => setShowCatalogModal(true)} 
            className="btn btn-secondary" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '10px', display: 'flex', gap: '6px' }}
          >
            <BookOpen size={14} /> Catalog
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Customer Details Form */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Customer Details
          </h3>
          
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Customer Name</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="tel" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  placeholder="Optional"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
                <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Invoice Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={invoiceNumber} 
                disabled 
                style={{ opacity: 0.6 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Item Form */}
        <form onSubmit={addCustomItem} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Add Custom Line Item
          </h3>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Item Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Wireless Mouse" 
              value={customItemName}
              onChange={(e) => {
                setCustomItemName(e.target.value);
                if (formError) setFormError('');
              }}
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Price per Unit *</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                placeholder="₹0.00" 
                value={customItemPrice}
                onChange={(e) => {
                  setCustomItemPrice(e.target.value);
                  if (formError) setFormError('');
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quantity</label>
              <input 
                type="number" 
                className="form-input" 
                value={customItemQty}
                onChange={(e) => setCustomItemQty(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tax Rate (%)</label>
              <select className="form-select" value={customItemTax} onChange={(e) => setCustomItemTax(e.target.value)}>
                <option value="0">0% (Exempt)</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Discount (%)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="0"
                value={customItemDiscount}
                onChange={(e) => setCustomItemDiscount(e.target.value)}
              />
            </div>
          </div>

          {formError && (
            <div style={{ 
              color: 'var(--danger)', 
              fontSize: '0.75rem', 
              fontWeight: '600', 
              marginTop: '10px',
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              textAlign: 'center'
            }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px' }}>
              <PlusCircle size={16} /> Add to Bill
            </button>
            <button type="button" onClick={saveCatalogItem} className="btn btn-secondary" style={{ padding: '10px' }} title="Save to local library catalog so you can click to load it next time">
              <Sparkles size={16} /> Save to Lib
            </button>
          </div>
        </form>

        {/* Current Bill items list */}
        <div className="glass-card">
          <h3 className="section-title" style={{ fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
            <Receipt size={18} style={{ color: 'var(--primary)' }} /> Bill Summary ({billItems.length} items)
          </h3>

          {billItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No items in the bill yet. Add items above or from Catalog.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {billItems.map((item) => {
                const itemTotal = (item.price * item.quantity * (1 - item.discountPercent / 100)) * (1 + item.taxPercent / 100);
                return (
                  <div 
                    key={item.id} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{item.name}</span>
                      <button 
                        onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '10px', alignItems: 'center' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Price</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ padding: '6px', fontSize: '0.8rem' }}
                          value={item.price}
                          onChange={(e) => handleItemFieldChange(item.id, 'price', e.target.value)}
                        />
                      </div>
                      
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Qty</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ padding: '6px', fontSize: '0.8rem' }}
                          value={item.quantity}
                          onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Tax %</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ padding: '6px', fontSize: '0.8rem' }}
                          value={item.taxPercent}
                          onChange={(e) => handleItemFieldChange(item.id, 'taxPercent', e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Disc %</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ padding: '6px', fontSize: '0.8rem' }}
                          value={item.discountPercent}
                          onChange={(e) => handleItemFieldChange(item.id, 'discountPercent', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Total: <span style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>₹{itemTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Total Sheet */}
              <div 
                style={{
                  borderTop: '1px dashed var(--border-color)',
                  paddingTop: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.9rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Total Discount:</span>
                  <span style={{ color: 'var(--danger)' }}>-₹{totals.discountTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Total Tax:</span>
                  <span style={{ color: 'var(--success)' }}>+₹{totals.taxTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.15rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '5px' }}>
                  <span>Grand Total:</span>
                  <span className="text-gradient">₹{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Action */}
              <button 
                type="button" 
                onClick={handleSaveInvoice}
                className="btn btn-primary" 
                style={{ height: '52px', marginTop: '10px', fontSize: '1.05rem' }}
              >
                <FileText size={20} /> Generate & Save Invoice PDF
              </button>

            </div>
          )}
        </div>

      </main>

      {/* Catalog Selector Modal */}
      {showCatalogModal && (
        <div className="modal-overlay" onClick={() => setShowCatalogModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Item Library Catalog</h3>
              <button 
                onClick={() => setShowCatalogModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Catalog Search */}
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search catalog items..."
                style={{ paddingLeft: '36px' }}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Catalog list */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {filteredCatalogItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No items found. Create items using "Save to Lib" in billing screen.
                </div>
              ) : (
                filteredCatalogItems.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      addCatalogItemToBill(item);
                      setShowCatalogModal(false);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    className="catalog-item-row"
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Tax: {item.taxPercent}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{item.price.toFixed(2)}</span>
                      <Plus size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: notification.type === 'error' ? 'var(--danger)' : 'var(--success)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          fontWeight: '600',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {notification.message}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
