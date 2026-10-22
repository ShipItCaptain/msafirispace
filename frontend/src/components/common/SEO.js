import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Msafiri Space';
const DEFAULT_DESCRIPTION = 'Find and book hotels and BnBs across Kenya on Msafiri Space.';

const SEO = ({ title, description }) => (
  <Helmet>
    <title>{title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Hotels & BnBs in Kenya`}</title>
    <meta name="description" content={description || DEFAULT_DESCRIPTION} />
  </Helmet>
);

export default SEO;
