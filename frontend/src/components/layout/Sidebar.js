"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Star } from 'lucide-react';
import { classNames } from '../../lib/utils';
import './layout.css';

export default function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Candidates', href: '/candidates', icon: Star },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>ImmiPulse</h2>
        <p>Yutian Newsroom</p>
      </div>
      
      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={false}
              className={classNames('nav-item', isActive && 'nav-item-active')}
            >
              <item.icon className="nav-icon" size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
