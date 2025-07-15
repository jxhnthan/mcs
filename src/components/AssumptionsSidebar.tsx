// src/components/AssumptionsSidebar.tsx
import React from 'react';

// Define the props interface for type-checking
interface AssumptionsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AssumptionsSidebar: React.FC<AssumptionsSidebarProps> = ({ isOpen, onClose }) => {
  return (
    // The overlay dims the background when the sidebar is open
    // Clicking it will close the sidebar
    <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      {/* Clicks inside the sidebar won't bubble up to the overlay */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <h3>Modeling Assumptions</h3>
          <button onClick={onClose} className="close-btn" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="sidebar-content">
          <ul>
            <li>
              <strong>Simulation Runs:</strong> Each scenario is simulated <strong>5,000 times</strong> to ensure a stable and reliable distribution of potential outcomes.
            </li>
            <li>
              <strong>Time Horizon:</strong> The model projects the waitlist size over a <strong>90-day period</strong>.
            </li>
            <li>
              <strong>Initial State:</strong> The simulation starts with a baseline waitlist of <strong>50 people</strong>.
            </li>
            <li>
              <strong>Demand Model:</strong> New patient inquiries follow a Normal (Gaussian) distribution, with the standard deviation set to 20% of the mean to model realistic daily fluctuations.
            </li>
            <li>
              <strong>Capacity Model:</strong> The number of patients seen daily also follows a Normal distribution, with a smaller standard deviation (10% of the mean) to reflect a more controlled process.
            </li>
            <li>
              <strong>Peak Seasonality:</strong> A predictable "peak season" is modeled between days 60 and 75, causing a <strong>50% increase</strong> in daily patient inquiries.
            </li>
            <li>
              <strong>Random Shocks:</strong> The model includes a <strong>5% daily probability</strong> of an unexpected staff leave, which reduces service capacity to zero for that day.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssumptionsSidebar;