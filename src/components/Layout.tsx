import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/calendar', label: 'Calendar', icon: '◫' },
  { to: '/create', label: 'Create', icon: '+' },
  { to: '/library', label: 'Library', icon: '≡' },
  { to: '/metrics', label: 'Metrics', icon: '◭' },
  { to: '/weekly', label: 'Weekly Plan', icon: '◧' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 fixed h-full">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">BrightWay</h1>
          <p className="text-xs text-gray-500">Thought Leadership</p>
        </div>
        <nav className="p-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 ml-56 p-6">
        <Outlet />
      </main>
    </div>
  );
}
