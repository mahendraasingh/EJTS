import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

export const MainLayout: React.FC = () => {
  const [globalSearch, setGlobalSearch] = useState('');

  return (
    <div className="flex h-screen bg-[#070c18] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNavbar onSearch={setGlobalSearch} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-[#070c18] to-[#0a1020]">
          <Outlet context={{ globalSearch }} />
        </main>
      </div>
    </div>
  );
};
