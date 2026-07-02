import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="h-[50px] border-b-2 border-brand-line bg-white flex items-center justify-between px-4 shrink-0 print:hidden">
      <div className="flex items-center gap-4">
        <span className="font-black tracking-tighter text-xl">AZM ABLMS v2.0</span>
        <form onSubmit={handleSearch} className="flex ml-6 border border-brand-line bg-white hidden md:flex">
          <input 
            type="text" 
            placeholder="Quick Scan or Search Product..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1 text-sm w-80 outline-none" 
          />
          <button type="submit" className="bg-brand-ink text-white px-4 text-xs uppercase font-sans cursor-pointer hover:bg-opacity-90">Find</button>
        </form>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => navigate('/products')} 
          className="bg-brand-accent text-white border border-brand-line px-4 py-1 text-xs cursor-pointer hover:opacity-90 font-bold uppercase"
        >
          + Import Excel
        </button>
        <button 
          onClick={() => navigate('/print')} 
          className="border border-brand-line px-4 py-1 text-xs uppercase bg-white cursor-pointer hover:bg-gray-100 font-bold"
        >
          Batch Print
        </button>
      </div>
    </div>
  );
}
