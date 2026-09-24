import { NavLink, Outlet } from 'react-router-dom';
import PageBanner from '../../components/common/PageBanner';
import { ROUTES } from '../../constants';

const tabs = [{ label: 'Companies', to: ROUTES.CONTROL_CENTER_COMPANIES }];

export default function ControlCenterLayout() {
  return (
    <div>
      <PageBanner
        className="mb-4"
        title="Control Center"
        subtitle="Legal entities, branch locations, and master data"
      />

      <div className="control-center-tabs-shell mb-4">
        <div className="control-center-tabs-list" role="tablist" aria-label="Control Center">
          {tabs.map((tab) => (
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
