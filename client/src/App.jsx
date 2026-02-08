import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Scanner from './pages/Scanner';
import MachineDetails from './pages/MachineDetails';
import MachineList from './pages/MachineList';
import ChecklistForm from './pages/ChecklistForm';
import OrganizationProfile from './pages/OrganizationProfile';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import SubmissionHistory from './pages/SubmissionHistory';
import LandingPage from './pages/LandingPage';
import Reports from './pages/Reports';
import Users from './pages/Users';

import ChecklistEdit from './pages/ChecklistEdit';
import PrivateRoute from './components/PrivateRoute';

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/machine/:id" element={<MachineDetails />} />
                <Route path="/scanner" element={<Scanner />} />

                {/* Protected Routes */}
                <Route element={<PrivateRoute />}>
                    <Route path="/dashboard" element={<Home />} />
                    <Route path="/checklist/:machineId" element={<ChecklistForm />} />
                    <Route path="/history" element={<SubmissionHistory />} />
                </Route>

                {/* Admin Routes */}
                <Route element={<PrivateRoute roles={['admin']} />}>
                    <Route path="/analytics" element={<AnalyticsDashboard />} />
                    <Route path="/machines" element={<MachineList />} />
                    <Route path="/organization" element={<OrganizationProfile />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/checklist/:id/edit" element={<ChecklistEdit />} />
                </Route>
            </Routes >
        </AuthProvider >
    );
}

export default App;
