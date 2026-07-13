'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Camera, Save, RefreshCw } from 'lucide-react';

export default function RegisterForm({ onSuccess }) {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState('Male');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [address, setAddress] = useState('');
  const [terms, setTerms] = useState('Thank you for your business!');
  const [logo, setLogo] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    const existing = await db.shop.get(1);
    if (existing) {
      setShopName(existing.shopName);
      setOwnerName(existing.ownerName);
      setAge(existing.age);
      setDob(existing.dob);
      setSex(existing.sex);
      setPhone(existing.phone);
      setPin(existing.pin);
      setAddress(existing.address || '');
      setTerms(existing.terms);
      setLogo(existing.logo || '');
      setIsEditing(true);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result); // Base64 encoding
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!shopName || !ownerName || !phone || !pin) {
      alert("Please fill in all required fields (Shop Name, Owner Name, Phone, Security PIN).");
      setLoading(false);
      return;
    }

    const shopData = {
      id: 1,
      shopName,
      ownerName,
      age: parseInt(age) || 0,
      dob,
      sex,
      phone,
      pin,
      address,
      terms,
      logo,
      updatedAt: new Date().toISOString()
    };

    try {
      await db.shop.put(shopData);
      alert(isEditing ? "Shop details updated successfully!" : "Shop registered successfully!");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error saving shop details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('app_unlocked');
    window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card page-fade-in" style={{ gap: '15px', display: 'flex', flexDirection: 'column' }}>
      
      {/* Logo Upload Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0 20px' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          {logo ? (
            <img 
              src={logo} 
              alt="Logo Preview" 
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
            />
          ) : (
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              background: 'rgba(255,255,255,0.03)', 
              border: '2px dashed var(--border-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              <Camera size={30} />
            </div>
          )}
          
          <label style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            background: 'var(--primary)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            border: '2px solid var(--bg-primary)'
          }}>
            <Camera size={14} style={{ color: 'white' }} />
            <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
          </label>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Shop Logo (Optional)
        </span>
      </div>

      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--primary)' }}>
        Shop Info
      </h3>

      <div className="form-group">
        <label className="form-label">Shop Name *</label>
        <input 
          type="text" 
          className="form-input" 
          value={shopName} 
          onChange={(e) => setShopName(e.target.value)} 
          required 
          placeholder="e.g. Sabari Supermarket"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Shop Address</label>
        <textarea 
          className="form-textarea" 
          rows={2}
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          placeholder="e.g. 123 Main Street, Salem, TN"
        />
      </div>

      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--primary)', marginTop: '10px' }}>
        Owner Details
      </h3>

      <div className="form-group">
        <label className="form-label">Owner Full Name *</label>
        <input 
          type="text" 
          className="form-input" 
          value={ownerName} 
          onChange={(e) => setOwnerName(e.target.value)} 
          required 
          placeholder="e.g. Sabari Nathan"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">DOB</label>
          <input 
            type="date" 
            className="form-input" 
            value={dob} 
            onChange={(e) => setDob(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Age</label>
          <input 
            type="number" 
            className="form-input" 
            value={age} 
            onChange={(e) => setAge(e.target.value)} 
            placeholder="Age"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Sex</label>
          <select className="form-select" value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Phone Number *</label>
          <input 
            type="tel" 
            className="form-input" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            required 
            placeholder="e.g. +91 9876543210"
          />
        </div>
      </div>

      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--primary)', marginTop: '10px' }}>
        Security & Preferences
      </h3>

      <div className="form-group">
        <label className="form-label">Security PIN (for Login Lock) *</label>
        <input 
          type="password" 
          className="form-input" 
          value={pin} 
          onChange={(e) => setPin(e.target.value)} 
          required 
          maxLength={8}
          placeholder="e.g. 1234"
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Numeric or alphanumeric passcode up to 8 characters.
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">Default Terms & Conditions (Invoice Footer)</label>
        <textarea 
          className="form-textarea" 
          rows={3}
          value={terms} 
          onChange={(e) => setTerms(e.target.value)} 
          placeholder="Default invoice footer, e.g. Goods once sold cannot be returned."
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ height: '48px', marginTop: '10px' }} disabled={loading}>
        <Save size={18} />
        {isEditing ? "Save & Update Details" : "Register Shop & Proceed"}
      </button>

      {isEditing && (
        <button type="button" onClick={handleLogout} className="btn btn-secondary" style={{ height: '48px', marginTop: '5px' }}>
          <RefreshCw size={18} />
          Lock Application (Logout)
        </button>
      )}
    </form>
  );
}
