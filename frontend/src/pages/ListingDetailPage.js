import React from 'react';
import { Navigate } from 'react-router-dom';

// Dead generic route, never linked anywhere -- real detail pages are
// /hotel/:id and /bnb/:id. Redirect rather than leave the old placeholder
// stub reachable to anyone who hits this URL directly.
const ListingDetailPage = () => <Navigate to="/" replace />;

export default ListingDetailPage;
