import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardHome from '../components/DashboardHome';
import DashboardMyTask from '@/components/DashboardMyTask';
import DashboardMembers from '@/components/DashboardMembers';
import DashboardSettings from '@/components/DashboardSettings';

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = new URLSearchParams(location.search).get('tab') || 'home';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <div className="md:w-56 border-r">
        <DashboardSidebar />
      </div>
      <div className="flex-1 p-6">
        {tab === 'home' && <DashboardHome />}
        {tab === 'mytask' && <DashboardMyTask />}
        {tab === 'members' && <DashboardMembers />}
        {tab === 'settings' && <DashboardSettings />}
        {/* Add more tabs as needed */}
        {!tab && <DashboardHome />}
      </div>
    </div>
  );
};

export default Dashboard;