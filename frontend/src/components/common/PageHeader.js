import React from 'react';

const PageHeader = ({ title, description, actions }) => (
  <div className="flex items-start justify-between gap-4 mb-7">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
