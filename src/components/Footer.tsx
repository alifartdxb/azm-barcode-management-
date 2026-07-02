import React from 'react';

export function Footer() {
  return (
    <div className="h-[28px] border-t-2 border-brand-line bg-brand-ink text-white flex items-center justify-between px-3 font-mono text-[10px] shrink-0 print:hidden">
      <div>SYSTEM: OPERATIONAL | DB: DEXIE.JS (OFFLINE)</div>
      <div className="flex gap-4">
        <span>SEARCH: &lt;10ms</span>
        <span>UI: RESPONSIVE</span>
        <span>PRINT QUEUE: IDLE</span>
      </div>
    </div>
  );
}
