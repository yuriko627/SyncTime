import React, { useState } from "react";
import { useScheduleStore } from "../stores/scheduleStore";
import { User, Plus, Settings, UserPlus, Users } from "lucide-react";

const UserSelector: React.FC = () => {
  const { 
    users, 
    currentUserId, 
    addUser, 
    setCurrentUser, 
    getActiveUsers 
  } = useScheduleStore();
  
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const activeUsers = getActiveUsers();
  const currentUser = currentUserId ? users[currentUserId] : null;

  const handleAddUser = () => {
    if (newUserName.trim()) {
      const userId = addUser({
        name: newUserName,
        calendarConnected: false,
      });
      setCurrentUser(userId);
      setNewUserName("");
      setShowAddUser(false);
    }
  };

  const handleSwitchUser = (userId: string) => {
    setCurrentUser(userId);
    setShowUserMenu(false);
  };

  return (
    <div className="relative">
      {/* Current User Display */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentUser?.color || '#6B7280' }}
          />
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">
            {currentUser?.name || 'No user selected'}
          </span>
        </div>
        
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="p-1 rounded hover:bg-gray-100"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* User Menu Dropdown */}
      {showUserMenu && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Switch User</h3>
            
            <div className="space-y-2 mb-4">
              {activeUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSwitchUser(user.id)}
                  className={`w-full flex items-center space-x-3 p-2 rounded-lg text-left hover:bg-gray-50 ${
                    currentUserId === user.id ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                  }`}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: user.color }}
                  />
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{user.name}</span>
                  {currentUserId === user.id && (
                    <span className="text-xs text-blue-600 ml-auto">Current</span>
                  )}
                </button>
              ))}
            </div>

            {/* Add New User */}
            {!showAddUser ? (
              <button
                onClick={() => setShowAddUser(true)}
                className="w-full flex items-center space-x-2 p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-sm">Add New User</span>
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddUser}
                    disabled={!newUserName.trim()}
                    className="flex-1 bg-blue-500 text-white py-1.5 px-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddUser(false);
                      setNewUserName("");
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-1.5 px-3 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default UserSelector;