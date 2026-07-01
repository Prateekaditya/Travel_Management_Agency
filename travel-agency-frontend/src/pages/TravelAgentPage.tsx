import { Navbar } from '../components';
import { useAuth } from '../context/AuthContext';

export default function TravelAgentPage() {
  const { auth } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Travel Agent Dashboard
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Welcome back, {auth?.userName || auth?.email}!
          </p>
          
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Agent Tools & Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-2">Manage Bookings</h3>
                <p className="text-sm text-gray-600">
                  View and manage customer bookings assigned to you.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-2">Customer Requests</h3>
                <p className="text-sm text-gray-600">
                  Review new booking requests and customer inquiries.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-2">Tour Management</h3>
                <p className="text-sm text-gray-600">
                  Create and update tour packages and availability.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This is a placeholder page for travel agents. 
              Add your specific agent features and functionality here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
