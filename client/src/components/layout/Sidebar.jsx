import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useMe } from '../../hooks/useAuth';
import {
  ChevronRightIcon,
  ControlCenterIcon,
  DashboardIcon,
  SettingsIcon,
} from '../icons/sidebarIcons';

// Groups take `children` (rendered as a collapsible section), e.g.
// { label: 'Reports', basePath: '/reports', Icon: ReportsIcon, children: [{ to, label }] }
const navItems = [
  { to: '/', label: 'Dashboard', end: true, Icon: DashboardIcon },
  {
    to: '/control-center/companies',
    basePath: '/control-center',
    label: 'Control Center',
    Icon: ControlCenterIcon,
  },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
];

const roleLabel = (role) => {
  if (role === 'superadmin') return 'Superadmin';
  if (role === 'accountant') return 'Accountant';
  return role || '';
};

const linkClass = (isOpen, isActive) =>
  `sidebar-nav-link flex min-w-0 items-center overflow-hidden rounded-lg text-md font-medium transition-colors ${
    isOpen ? 'gap-3 justify-start px-3 py-2' : 'justify-center px-2 py-2.5'
  } ${
    isActive
      ? 'sidebar-nav-link--active bg-white/75 text-[#0b2f81] shadow-sm'
      : 'sidebar-nav-link--inactive text-primary-100 hover:bg-white/70 hover:text-[#0b2f81]'
  }`;

const Sidebar = ({ isOpen = true }) => {
  const { data: user } = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const [reportsOpen, setReportsOpen] = useState(() => location.pathname.startsWith('/reports'));

  return (
    <aside
      data-open={isOpen}
      className={`flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#0b2f81] via-[#1446a0] to-[#1d5fb3] text-white flex flex-col h-full transition-[width] duration-300 ease-in-out will-change-[width] ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center border-b border-primary-800 transition-all duration-200 ${
          isOpen ? 'px-3 py-2' : 'px-2 py-2'
        }`}
      >
        <div className="flex w-full min-w-0 items-center justify-center gap-2">
          <img src="/shield.svg" alt="Insurance MIS" className="h-7 w-7 flex-shrink-0 object-contain" />
          {isOpen && (
            <span className="truncate text-lg font-semibold tracking-wide text-white">
              Insurance MIS
            </span>
          )}
        </div>
      </div>

      <nav
        className={`flex-1 overflow-x-hidden overflow-y-auto py-4 space-y-1 ${
          isOpen ? 'px-3' : 'px-2'
        }`}
      >
        {navItems.map((item) => {
          const { Icon } = item;
          if (item.children) {
            const isGroupActive = location.pathname.startsWith(item.basePath);
            return (
              <div key={item.label}>
                <button
                  type="button"
                  title={!isOpen ? item.label : undefined}
                  onClick={() =>
                    isOpen ? setReportsOpen((prev) => !prev) : navigate(item.children[0].to)
                  }
                  className={`w-full ${linkClass(isOpen, isGroupActive)}`}
                >
                  <Icon className={`${isOpen ? 'w-5 h-5' : 'w-7 h-7'} flex-shrink-0`} />
                  {isOpen && (
                    <span className="flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                  {isOpen && (
                    <ChevronRightIcon
                      className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                        reportsOpen ? 'rotate-90' : ''
                      }`}
                    />
                  )}
                </button>

                {isOpen && reportsOpen && (
                  <div className="mt-1 space-y-1 pl-4">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `sidebar-nav-link flex items-center gap-3 rounded-lg pl-4 pr-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'sidebar-nav-link--active bg-white/75 text-[#0b2f81] shadow-sm'
                              : 'sidebar-nav-link--inactive text-primary-100 hover:bg-white/70 hover:text-[#0b2f81]'
                          }`
                        }
                      >
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
                        <span className="whitespace-nowrap">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={!isOpen ? item.label : undefined}
              className={({ isActive }) => {
                const isItemActive = item.basePath
                  ? location.pathname.startsWith(item.basePath)
                  : isActive;
                return linkClass(isOpen, isItemActive);
              }}
            >
              <Icon className={`${isOpen ? 'w-5 h-5' : 'w-7 h-7'} flex-shrink-0`} />
              {isOpen && (
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div
        className={`py-4 border-t border-primary-800 transition-[padding] duration-300 ease-in-out ${isOpen ? 'px-4' : 'px-2'}`}
      >
        <div
          className={`flex items-center gap-3 ${isOpen ? '' : 'justify-center'}`}
          title={!isOpen ? user?.name : undefined}
        >
          <div className="sidebar-user-avatar text-lg font-semibold">
            {roleLabel(user?.role).charAt(0).toUpperCase()}
          </div>
          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
              isOpen ? 'w-full opacity-100' : 'w-0 opacity-0'
            }`}
          >
            <p className="text-md font-medium text-white truncate whitespace-nowrap">{user?.name}</p>
            <p className="sidebar-user-role text-sm truncate whitespace-nowrap">{roleLabel(user?.role)}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
