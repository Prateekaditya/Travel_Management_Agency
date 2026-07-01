import React from 'react';
import { useRouter } from '../context/RouterContext';

interface BreadcrumbProps {
  tourTitle?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ tourTitle }) => {
  const { setRoute } = useRouter();
  return (
    <nav aria-label="breadcrumb" style={{ marginBottom: 16 }}>
      <ol style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#3A5A7A', fontWeight: 500 }}>
        <li
          style={{ cursor: 'pointer', color: '#027EAC' }}
          onClick={() => setRoute({ view: 'all', tourId: '' })}
        >
          Main page
        </li>
        <li style={{ color: '#3A5A7A', fontWeight: 400 }}>&gt;</li>
        <li style={{ color: '#1A2A3A', fontWeight: 600 }}>{tourTitle}</li>
      </ol>
    </nav>
  );
};

export default Breadcrumb;
