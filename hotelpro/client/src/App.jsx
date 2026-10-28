import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import { Login, Register } from './pages/Auth';
import { ForgotPassword, ResetPassword } from './pages/Password';
import Pay from './pages/Pay';
import MyBookings from './pages/MyBookings';
import { Profile, Notifications } from './pages/Account';
import Staff from './pages/Staff';
import Admin from './pages/Admin';

export default function App() {
  return (<>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/rooms" element={<Rooms />} />
      <Route path="/rooms/:id" element={<RoomDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/pay/:id" element={<ProtectedRoute roles={['guest']}><Pay /></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute roles={['guest']}><MyBookings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute roles={['staff', 'admin']}><Staff /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <ToastContainer position="bottom-right" autoClose={3000} />
  </>);
}
