import React from 'react';
import { Navigate } from 'react-router-dom';

// No standalone search experience exists -- Hotels and BnBs each have their
// own real search/filter UI. Redirect rather than leave the old placeholder
// stub reachable (it was linked from Dashboard's empty states).
const SearchPage = () => <Navigate to="/" replace />;

export default SearchPage;
