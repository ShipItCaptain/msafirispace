import React from 'react';

// The 48-80px section-gap spec, encoded once. `my-16` = 64px, the midpoint
// of that range — a sensible single default rather than a prop per usage.
const SectionDivider = () => <hr className="border-hairline my-16" />;

export default SectionDivider;
