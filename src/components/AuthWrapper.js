'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { db, initDefaultItems } from '@/lib/db';
import { Lock, Store, Eye, EyeOff, Loader2 } from 'lucide-react';
import RegisterForm from './RegisterForm';

export default function AuthWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkRegistration();
  }, [pathname]);

  const checkRegistration = async () => {
    try {
      setLoading(true);
      await initDefaultItems(); // seed items if empty
      const shopDetails = await db.shop.get(1);
      
      if (shopDetails) {
        setShop(shopDetails);
        // If we are already unlocked, or if we are going to a public-like route (though there are none in this local app)
        // For simplicity, session storage tracks unlock status per session
        const sessionUnlocked = sessionStorage.getItem('app_unlocked') === 'true';
        if (sessionUnlocked) {
          setIsUnlocked(true);
        } else {
          setIsUnlocked(false);
        }
      } else {
        setShop(null);
        setIsUnlocked(false);
      }
    } catch (err) {
      console.error("Error reading database:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!shop) return;
    
    if (pinInput === shop.pin) {
      sessionStorage.setItem('app_unlocked', 'true');
      setIsUnlocked(true);
      setPinInput('');
    } else {
      setError('Incorrect PIN code. Please try again.');
      setPinInput('');
    }
  };

  const handleRegisterSuccess = () => {
    checkRegistration();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary)', marginBottom: '15px' }} />
        <p>Loading database...</p>
      </div>
    );
  }

  // Case 1: No Shop Registered -> Force Onboarding
  if (!shop) {
    return (
      <div className="app-container page-fade-in" style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', margin: '30px 0 10px' }}>
          <Store size={48} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
          <h1 className="app-title" style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Register Shop</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Set up your shop details to initialize the billing software.
          </p>
        </div>
        <RegisterForm onSuccess={handleRegisterSuccess} />
      </div>
    );
  }

  // Case 2: Shop Registered, but Locked -> PIN Entry
  if (!isUnlocked) {
    return (
      <div className="app-container page-fade-in" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="glass-card" style={{ padding: '30px 24px', textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            border: '1px solid var(--border-color-glow)'
          }}>
            <Lock size={28} style={{ color: 'var(--primary)' }} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>{shop.shopName}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Enter your Security PIN to unlock
          </p>

          <form onSubmit={handleUnlock}>
            <div className="form-group" style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type={showPin ? 'text' : 'password'}
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '8px', padding: '12px' }}
                placeholder="••••"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500' }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary" style={{ height: '48px' }}>
              Unlock Application
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Case 3: Shop Registered & Unlocked -> Allow Access
  return <>{children}</>;
}
