import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from "./pages/Home";
import MyTickets from "./pages/MyTicket";
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import TicketDetail from "./pages/TicketDetail";
import TicketsDashboard from "./pages/TicketsDashboard";
import Users from "./pages/User";
// import CreatedByMe from './pages/createdbyme';
import NotificationsPage from "./pages/Notifications";
import TicketsCreatedByMe from "./pages/TicketsCreatedByMe";
import UserTicket from "./pages/userticket";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminDashboard from "./pages/AdminDashboard";
import Helpdesk from "./pages/Helpdesk";
import PendingDepartmentChanges from "./pages/PendingDepartmentChanges";

import ProductManagement from "./pages/ProductManagement";
import ProfilePage from "./pages/Profile";

const App: React.FC = () => {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} closeOnClick draggable pauseOnHover />
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<Home />} />
        <Route path="/helpdesk" element={<Helpdesk />} />
        <Route path="/tickets" element={<TicketsDashboard />} />
        <Route path="/tickets/:productId" element={<TicketsDashboard />} />
        <Route path="/my-tickets/:productId" element={<MyTickets />} />
        {/* <Route path="/ticketsbyme" element={<CreatedByMe />} /> */}
        <Route path="/ticket/:id" element={<TicketDetail />} />
        <Route path="/userticket/:id" element={<UserTicket />} />
        <Route path="/users" element={<Users />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/created-by-me" element={<TicketsCreatedByMe />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/product-management" element={<ProductManagement />} />
        <Route path="/pending-department-changes" element={<PendingDepartmentChanges />} />
        {/* Add dashboard route later */}
      </Routes>
    </Router>
  );
};

export default App;
