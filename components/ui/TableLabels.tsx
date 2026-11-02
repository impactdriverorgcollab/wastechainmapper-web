'use client';

import { useEffect } from 'react';

/**
 * On phones a table shows each row as a small card, with the column name beside each value (see
 * .data-table in globals.css). That needs every cell to know its column, so this copies the headings
 * across for all tables in one place. CSS also strips a stacked table's meaning from screen readers,
 * so the roles are set here too.
 */
function labelTables() {
  document.querySelectorAll<HTMLTableElement>('table.data-table').forEach((table) => {
    const headings = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent?.trim() ?? '');
    table.setAttribute('role', 'table');
    table.querySelectorAll('thead, tbody').forEach((group) => group.setAttribute('role', 'rowgroup'));
    table.querySelectorAll('tr').forEach((row) => row.setAttribute('role', 'row'));
    table.querySelectorAll('thead th').forEach((th) => th.setAttribute('role', 'columnheader'));
    table.querySelectorAll('tbody tr').forEach((row) => {
      Array.from(row.children).forEach((cell, i) => {
        cell.setAttribute('role', 'cell');
        if (cell.getAttribute('data-label') !== (headings[i] ?? '')) cell.setAttribute('data-label', headings[i] ?? '');
      });
    });
  });
}

export function TableLabels() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => { frame ||= requestAnimationFrame(() => { frame = 0; labelTables(); }); };
    labelTables();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  return null;
}
