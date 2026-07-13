'use client';

import { useState, useEffect } from 'react';
import { db, initDefaultItems } from '@/lib/db';
import RegisterForm from '@/components/RegisterForm';
import BottomNav from '@/components/BottomNav';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  Store, 
  BookOpen, 
  Users, 
  Database, 
  Trash2, 
  Plus, 
  Download, 
  Upload, 
  Search, 
  ShoppingBag,
  TrendingUp,
  Receipt,
  CreditCard
} from 'lucide-react';

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState('profile'); // profile, inventory, expenses, customers, backup

  // Inventory states
  const [catalogItems, setCatalogItems] = useState([]);
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogPrice, setNewCatalogPrice] = useState('');
  const [newCatalogTax, setNewCatalogTax] = useState('18');
  const [newCatalogSearch, setNewCatalogSearch] = useState('');

  // Expenses states
  const [expenses, setExpenses] = useState([]);
  const [newExpCategory, setNewExpCategory] = useState('Goods Purchase');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpDate, setNewExpDate] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [expSearch, setExpSearch] = useState('');

  // Customer states
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Backup states
  const [importFile, setImportFile] = useState(null);

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadCatalog();
    } else if (activeTab === 'expenses') {
      loadExpenses();
    } else if (activeTab === 'customers') {
      loadCustomers();
    }
  }, [activeTab]);

  // --- Inventory functions ---
  const loadCatalog = async () => {
    const items = await db.items.toArray();
    setCatalogItems(items);
  };

  const handleAddCatalogItem = async (e) => {
    e.preventDefault();
    if (!newCatalogName || !newCatalogPrice) return;

    const newItem = {
      name: newCatalogName,
      price: parseFloat(newCatalogPrice) || 0,
      taxPercent: parseFloat(newCatalogTax) || 0
    };

    await db.items.add(newItem);
    setNewCatalogName('');
    setNewCatalogPrice('');
    loadCatalog();
    alert("Item added to catalog successfully!");
  };

  const handleDeleteCatalogItem = async (id, name) => {
    if (confirm(`Delete '${name}' from item catalog?`)) {
      await db.items.delete(id);
      loadCatalog();
    }
  };

  const filteredCatalog = catalogItems.filter(item => 
    item.name.toLowerCase().includes(newCatalogSearch.toLowerCase())
  );

  // --- Expenses functions ---
  const loadExpenses = async () => {
    const items = await db.expenses.orderBy('timestamp').reverse().toArray();
    setExpenses(items);
    setNewExpDate(new Date().toISOString().split('T')[0]);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpAmount) return;

    const newExpense = {
      category: newExpCategory,
      amount: parseFloat(newExpAmount) || 0,
      date: newExpDate || new Date().toISOString().split('T')[0],
      description: newExpDesc || '',
      timestamp: newExpDate ? new Date(newExpDate).getTime() : Date.now()
    };

    await db.expenses.add(newExpense);
    setNewExpAmount('');
    setNewExpDesc('');
    loadExpenses();
    alert("Expense recorded successfully!");
  };

  const handleDeleteExpense = async (id, cat, amt) => {
    if (confirm(`Delete expense of Rs. ${amt} under '${cat}'?`)) {
      await db.expenses.delete(id);
      loadExpenses();
    }
  };

  const filteredExpenses = expenses.filter(exp => 
    exp.category.toLowerCase().includes(expSearch.toLowerCase()) ||
    exp.description.toLowerCase().includes(expSearch.toLowerCase())
  );

  // --- Customers Directory functions ---
  const loadCustomers = async () => {
    const sales = await db.sales.toArray();
    
    const custMap = {};
    sales.forEach(sale => {
      const phone = sale.customerPhone || 'Walk-in';
      const name = sale.customerName || 'Walk-in Customer';
      
      if (!custMap[phone]) {
        custMap[phone] = {
          name: name,
          phone: phone,
          totalSpend: 0,
          billsCount: 0,
          lastVisit: 0
        };
      }
      custMap[phone].totalSpend += sale.grandTotal;
      custMap[phone].billsCount += 1;
      if (sale.timestamp > custMap[phone].lastVisit) {
        custMap[phone].lastVisit = sale.timestamp;
      }
    });

    const custArray = Object.values(custMap).sort((a, b) => b.totalSpend - a.totalSpend);
    setCustomers(custArray);
  };

  const filteredCustomers = customers.filter(cust => 
    cust.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    cust.phone.includes(customerSearch)
  );

  // --- Backup & Restore functions ---
  const handleExportBackup = async () => {
    try {
      const shop = await db.shop.toArray();
      const sales = await db.sales.toArray();
      const items = await db.items.toArray();
      const expenses = await db.expenses.toArray();

      const backupData = {
        app: 'Invoxa',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: { shop, sales, items, expenses }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoxa_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert("Database backup exported successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to export backup.");
    }
  };

  const handleImportBackup = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        if (backupData.app !== 'Invoxa' && backupData.app !== 'Sabari Billing') {
          alert("Invalid backup file format. Please upload a valid Invoxa JSON backup.");
          return;
        }

        if (confirm("WARNING: Importing this backup will OVERWRITE all current local database entries. Do you wish to continue?")) {
          // Clear current tables
          await db.shop.clear();
          await db.sales.clear();
          await db.items.clear();
          await db.expenses.clear();

          // Restore tables
          const { shop, sales, items, expenses } = backupData.data;
          
          if (shop && shop.length > 0) await db.shop.bulkAdd(shop);
          if (sales && sales.length > 0) await db.sales.bulkAdd(sales);
          if (items && items.length > 0) await db.items.bulkAdd(items);
          if (expenses && expenses.length > 0) await db.expenses.bulkAdd(expenses);

          alert("Database successfully restored! The app will now reload.");
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON backup file. Ensure the file is correct.");
      }
    };
    reader.readAsText(importFile);
  };

  return (
    <div className="app-container page-fade-in">
      <header className="app-header">
        <div className="logo-container">
          <Store size={22} style={{ color: 'var(--primary)' }} />
          <h1 className="app-title">Management Desk</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Sub Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        padding: '12px 6px', 
        background: 'var(--bg-card-subtle)',
        borderBottom: '1px solid var(--border-color)',
        gap: '4px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'profile', label: 'Shop', icon: Store },
          { id: 'inventory', label: 'Catalog', icon: BookOpen },
          { id: 'expenses', label: 'Expenses', icon: CreditCard },
          { id: 'customers', label: 'CRM', icon: Users },
          { id: 'backup', label: 'Backup', icon: Database }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 8px',
                border: 'none',
                background: isSelected ? 'var(--primary)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flex: '1 0 auto',
                justifyContent: 'center'
              }}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <main style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        
        {/* TAB 1: Shop Profile */}
        {activeTab === 'profile' && (
          <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Modify your core shop settings, owner details, security passcode, and invoice terms of sale.
            </p>
            <RegisterForm />
          </div>
        )}

        {/* TAB 2: Inventory Catalog Library Manager */}
        {activeTab === 'inventory' && (
          <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Add Catalog Item Form */}
            <form onSubmit={handleAddCatalogItem} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Create New Catalog Product
              </h3>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Product Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Cadbury Silk Chocolate"
                  value={newCatalogName}
                  onChange={(e) => setNewCatalogName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Price per Unit *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    placeholder="Rs. 0.00"
                    value={newCatalogPrice}
                    onChange={(e) => setNewCatalogPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">GST Tax Slab</label>
                  <select 
                    className="form-select"
                    value={newCatalogTax}
                    onChange={(e) => setNewCatalogTax(e.target.value)}
                  >
                    <option value="0">0% Slab</option>
                    <option value="5">5% Slab</option>
                    <option value="12">12% Slab</option>
                    <option value="18">18% Slab</option>
                    <option value="28">28% Slab</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '10px', marginTop: '5px' }}>
                <Plus size={16} /> Add Product to Catalog
              </button>
            </form>

            {/* List Catalog Items */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="section-title" style={{ fontSize: '1rem', margin: 0 }}>
                  Product Catalog ({catalogItems.length})
                </h3>
                <div style={{ position: 'relative', width: '150px' }}>
                  <input 
                    type="text" 
                    placeholder="Search..."
                    className="form-input"
                    style={{ padding: '6px 12px 6px 28px', fontSize: '0.8rem', borderRadius: '8px' }}
                    value={newCatalogSearch}
                    onChange={(e) => setNewCatalogSearch(e.target.value)}
                  />
                  <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {filteredCatalog.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.85rem' }}>
                  No catalog items found. Add items using the form above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredCatalog.map(item => (
                    <div 
                      key={item.id} 
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.name}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          GST: {item.taxPercent}% Slab
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.95rem' }}>
                          Rs. {item.price.toFixed(2)}
                        </span>
                        <button 
                          onClick={() => handleDeleteCatalogItem(item.id, item.name)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
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
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Expense Tracker Ledger */}
        {activeTab === 'expenses' && (
          <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Record Expense Form */}
            <form onSubmit={handleAddExpense} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Log Shop Operational Expense
              </h3>
              
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category *</label>
                  <select 
                    className="form-select"
                    value={newExpCategory}
                    onChange={(e) => setNewExpCategory(e.target.value)}
                  >
                    <option value="Goods Purchase">Goods Purchase</option>
                    <option value="Store Rent">Store Rent</option>
                    <option value="Electricity / Utilities">Electricity / Utilities</option>
                    <option value="Staff Salaries">Staff Salaries</option>
                    <option value="Marketing / Ads">Marketing / Ads</option>
                    <option value="Maintenance / Fixes">Maintenance / Fixes</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expense Amount (Rs.) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-input" 
                    placeholder="Rs. 0.00"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newExpDate}
                    onChange={(e) => setNewExpDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description / Notes</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Optional details"
                    value={newExpDesc}
                    onChange={(e) => setNewExpDesc(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '10px', marginTop: '5px' }}>
                <Plus size={16} /> Log Expense Record
              </button>
            </form>

            {/* List Expenses */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="section-title" style={{ fontSize: '1rem', margin: 0 }}>
                    Expenses Log Ledger
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--danger)' }}>
                    Total: Rs. {expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ position: 'relative', width: '150px' }}>
                  <input 
                    type="text" 
                    placeholder="Filter category..."
                    className="form-input"
                    style={{ padding: '6px 12px 6px 28px', fontSize: '0.8rem', borderRadius: '8px' }}
                    value={expSearch}
                    onChange={(e) => setExpSearch(e.target.value)}
                  />
                  <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '25px 0', fontSize: '0.85rem' }}>
                  No expenses recorded. Log your store costs above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredExpenses.map(exp => (
                    <div 
                      key={exp.id} 
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{exp.category}</span>
                        {exp.description && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                            {exp.description}
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(exp.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--danger)', fontSize: '0.95rem' }}>
                          Rs. {exp.amount.toFixed(2)}
                        </span>
                        <button 
                          onClick={() => handleDeleteExpense(exp.id, exp.category, exp.amount)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
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
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Customer CRM Directory */}
        {activeTab === 'customers' && (
          <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="section-title" style={{ fontSize: '1rem', margin: 0 }}>
                  Customer Ledger CRM
                </h3>
                <div style={{ position: 'relative', width: '160px' }}>
                  <input 
                    type="text" 
                    placeholder="Search by name/tel..."
                    className="form-input"
                    style={{ padding: '6px 12px 6px 28px', fontSize: '0.8rem', borderRadius: '8px' }}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Database auto-compiled from invoices. Sorted by total store purchases.
              </p>

              {filteredCustomers.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0', fontSize: '0.85rem' }}>
                  No customer records logged. Generate bills to see CRM database.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                  {filteredCustomers.map((cust, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{cust.name}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Phone: {cust.phone}  |  Visit Count: {cust.billsCount}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '700', color: 'var(--success)', fontSize: '0.95rem', display: 'block' }}>
                          Rs. {cust.totalSpend.toFixed(2)}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Spent Total
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Database Backup & Restore */}
        {activeTab === 'backup' && (
          <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Export database */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 className="section-title" style={{ fontSize: '1rem', margin: 0, color: 'var(--primary)' }}>
                <Database size={18} /> Export Database Backup
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Download all your shop settings, items catalog, expenses, and billing invoice history records into a single JSON file. You can save this backup to your phone storage or transfer it to another device.
              </p>
              <button onClick={handleExportBackup} className="btn btn-primary" style={{ padding: '12px', height: '46px' }}>
                <Download size={16} /> Download Backup (.JSON)
              </button>
            </div>

            {/* Import database */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 className="section-title" style={{ fontSize: '1rem', margin: 0, color: 'var(--secondary)' }}>
                <Upload size={18} /> Restore Database Backup
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Choose a previously exported Invoxa JSON file to restore your entire database. 
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}> Warning: This will overwrite all current settings, catalog, expenses, and invoices on this device.</span>
              </p>
              
              <form onSubmit={handleImportBackup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  type="file" 
                  accept=".json"
                  className="form-input"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  required
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '12px', height: '46px', borderColor: 'var(--secondary)', color: 'var(--secondary)' }}>
                  <Upload size={16} /> Import & Restore Database
                </button>
              </form>
            </div>

          </div>
        )}

      </main>

      <BottomNav />
    </div>
  );
}
