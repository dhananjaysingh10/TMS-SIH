import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import Home from "./pages/Home";
import TicketsDashboard from "./pages/TicketsDashboard";
import MyTickets from "./pages/MyTicket";
import TicketDetail from "./pages/TicketDetail";
import Users from "./pages/User";
// import CreatedByMe from './pages/createdbyme';
import UserTicket from "./pages/userticket";
import TicketsCreatedByMe from "./pages/TicketsCreatedByMe";

import ProfilePage from "./pages/Profile";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App: React.FC = () => {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} closeOnClick draggable pauseOnHover />
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<Home />} />
        <Route path="/tickets" element={<TicketsDashboard />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        {/* <Route path="/ticketsbyme" element={<CreatedByMe />} /> */}
        <Route path="/ticket/:id" element={<TicketDetail />} />
        <Route path="/userticket/:id" element={<UserTicket />} />
        <Route path="/users" element={<Users />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/created-by-me" element={<TicketsCreatedByMe />} />
        {/* Add dashboard route later */}
      </Routes>
    </Router>
  );
};

export default App;
