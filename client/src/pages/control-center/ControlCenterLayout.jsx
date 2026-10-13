import { NavLink, Outlet } from 'react-router-dom';
import PageBanner from '../../components/common/PageBanner';
import { ROUTES } from '../../constants';
import { CATALOG_TABS } from '../../constants/catalogs';
import { MASTER_VIEW_ROLES } from '../../constants/roles';
import { useMe } from '../../hooks/useAuth';

// A tab with `roles` is only shown to those roles; tabs without it are shown to everyone.
const tabs = [
  { label: 'Companies', to: ROUTES.CONTROL_CENTER_COMPANIES },
  { label: 'Departments', to: ROUTES.CONTROL_CENTER_DEPARTMENTS, roles: MASTER_VIEW_ROLES },
  ...CATALOG_TABS.map(({ label, path }) => ({
    label,
    to: `${ROUTES.CONTROL_CENTER}/${path}`,
    roles: MASTER_VIEW_ROLES,
  })),
];

export default function ControlCenterLayout() {
  const { data: user } = useMe();
  const visibleTabs = tabs.filter((tab) => !tab.roles || tab.roles.includes(user?.role));

  return (
    <div>
      <PageBanner
        className="mb-4"
        title="Control Center"
        subtitle="Legal entities, branches, and master data"
      />

      <div className="control-center-tabs-shell mb-4">
        <div className="control-center-tabs-list" role="tablist" aria-label="Control Center">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                isActive ? 'control-center-tab control-center-tab--active' : 'control-center-tab'
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
