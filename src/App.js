import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HouseholdProvider } from './context/HouseholdContext';
import { BannerProvider } from './components/PushBanner';
import AppLayout from './components/AppLayout';
import { Splash } from './components/ui';
import Login from './screens/Login';
import Household from './screens/Household';
import Home from './screens/Home';
import Plan from './screens/Plan';
import Recipes from './screens/Recipes';
import RecipeDetail from './screens/RecipeDetail';
import RecipeEdit from './screens/RecipeEdit';
import Cart from './screens/Cart';
import CartCheckout from './screens/CartCheckout';
import Notifications from './screens/Notifications';
import Settings from './screens/Settings';

function Gate() {
  const { user, loading, profileLoading, householdId } = useAuth();

  if (loading || (user && profileLoading)) return <Splash />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!householdId) {
    return (
      <Routes>
        <Route path="/household" element={<Household />} />
        <Route path="*" element={<Navigate to="/household" replace />} />
      </Routes>
    );
  }

  return (
    <HouseholdProvider hid={householdId}>
      <BannerProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipes/new" element={<RecipeEdit />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/cart/checkout" element={<CartCheckout />} />
            {/* old links (notifications, bookmarks) */}
            <Route path="/cart/done" element={<CartCheckout />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/household" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BannerProvider>
    </HouseholdProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
