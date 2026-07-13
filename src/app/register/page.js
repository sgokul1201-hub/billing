'use client';

import RegisterForm from '@/components/RegisterForm';
import BottomNav from '@/components/BottomNav';
import { Store } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="app-container page-fade-in">
      <header className="app-header">
        <div className="logo-container">
          <Store size={22} style={{ color: 'var(--primary)' }} />
          <h1 className="app-title">Shop Profile</h1>
        </div>
      </header>

      <main style={{ padding: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Here you can view and update your shop details, owner credentials, invoice footer terms, and change your lock security PIN.
        </p>
        <RegisterForm />
      </main>

      <BottomNav />
    </div>
  );
}
