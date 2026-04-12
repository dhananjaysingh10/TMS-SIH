import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { selectCurrentUser } from '../redux/user/userSlice';

export default function PrivateRoute() {
  const currentUser = useSelector(selectCurrentUser);
  return currentUser ? <Outlet /> : <Navigate to="/signin" />;
}
