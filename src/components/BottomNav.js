'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, Calendar, Store } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Billing', path: '/billing', icon: PlusCircle },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Shop', path: '/register', icon: Store },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;

        return (
          <Link
            key={item.path}
            href={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-item-icon">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            </span>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
