import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import Home from "./pages/Home";
import TicketsDashboard from "./pages/TicketsDashboard";
import MyTickets from "./pages/MyTicket";
import TicketDetail from "./pages/TicketDetail";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<Home />} />
        <Route path="/tickets" element={<TicketsDashboard />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/ticket/:id" element={<TicketDetail />} />
        {/* Add dashboard route later */}
      </Routes>
    </Router>
  );
};

export default App;
