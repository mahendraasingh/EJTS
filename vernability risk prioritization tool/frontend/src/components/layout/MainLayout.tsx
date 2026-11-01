import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

export const MainLayout: React.FC = () => {
  const [globalSearch, setGlobalSearch] = useState('');

  return (
    <div className="flex h-screen bg-[#000000] overflow-hidden transition-colors">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNavbar onSearch={setGlobalSearch} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#000000]">
          <Outlet context={{ globalSearch }} />
        </main>
      </div>
    </div>
  );
};
