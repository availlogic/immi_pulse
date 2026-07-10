"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Star } from 'lucide-react';
import { classNames } from '../../lib/utils';
import './layout.css';

export default function BottomNav() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Feed', href: '/', icon: Home },
    { name: 'Saved', href: '/candidates', icon: Star },
  ];

  return (
    <div className="bottom-nav">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            prefetch={false}
            className={classNames('bottom-nav-item', isActive && 'active')}
          >
            <item.icon size={24} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
